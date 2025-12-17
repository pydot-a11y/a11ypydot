from typing import List, Dict, Optional
import requests
from urllib.parse import urlencode
from requests_kerberos import HTTPKerberosAuth

TAI_BASE_URLS = {
    "DEV":  "http://taidss.webfarm-qa.ms.com/web/1/services/query/",
    "QA":   "http://taidss.webfarm-qa.ms.com/web/1/services/query/",
    "PROD": "http://taidss.webfarm.ms.com/web/1/services/query/",
}

def _get_base_url(env: str) -> str:
    env_upper = env.upper()
    if env_upper not in TAI_BASE_URLS:
        raise ValueError(f"Unknown environment [{env}]")
    return TAI_BASE_URLS[env_upper]

def _build_query_url(
    env: str,
    dataset: str,
    columns: Optional[str] = None,
    filter_expr: Optional[str] = None,
    mime: str = "json",
) -> str:
    """
    TAI format:
      {base}/<mime>/<dataset>?c=<cols>&f=<filter>
    """
    base = _get_base_url(env).rstrip("/") + "/"
    path = f"{mime}/{dataset}"

    params = {}
    if columns:
        params["c"] = columns
    if filter_expr:
        params["f"] = filter_expr

    qs = ("?" + urlencode(params, safe="=;.,_")) if params else ""
    return f"{base}{path}{qs}"

def get_user_department(env: str, user_ids: List[str]) -> List[Dict]:
    """
    Returns TAI rows for user metadata lookup.

    Assumptions for MVP:
      - dataset = "user"
      - user id field = user.user
      - department field = user.division

    If your real ID column is different (e.g. user.eon_id), swap it below.
    """
    if not user_ids:
        return []

    dataset = "user"
    columns = "user.user,user.division"

    # Multiple values are separated by ';' in TAI
    joined_ids = ";".join([uid.strip() for uid in user_ids if uid.strip()])

    # operator is '='
    # If your IDs are actually EON ids, change left side to: user.eon_id
    filter_expr = f"user.user={joined_ids}"

    url = _build_query_url(env=env, dataset=dataset, columns=columns, filter_expr=filter_expr, mime="json")

    resp = requests.get(url, auth=HTTPKerberosAuth(), timeout=60)

    # Make failures obvious (so your API endpoint can return the real reason)
    if resp.status_code >= 400:
        snippet = resp.text[:500] if resp.text else ""
        raise RuntimeError(f"TAI request failed: {resp.status_code} {resp.reason}. Body: {snippet}")

    payload = resp.json()

    # TAI returns rows in payload["data"]
    return payload.get("data", [])