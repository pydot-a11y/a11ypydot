from typing import List, Dict
import logging
import requests
from requests_kerberos import HTTPKerberosAuth

log = logging.getLogger(__name__)

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

def get_user_metadata(env: str, user_ids: List[str]) -> List[Dict]:
    if not user_ids:
        return []

    base_url = _get_base_url(env)

    dataset = "user"
    columns = "user.user,user.job_title,user.division,user.department"

    # TAI expects ; between values
    filter_values = ";".join(user_ids)
    filter_expr = f"user.user={filter_values}"

    url = f"{base_url}{dataset}"
    params = {"c": columns, "f": filter_expr}

    log.info("TAI GET %s params=%s", url, params)

    resp = requests.get(
        url,
        params=params,
        auth=HTTPKerberosAuth(principal=""),
        timeout=60,
    )

    if not resp.ok:
        raise RuntimeError(f"TAI request failed: {resp.status_code} {resp.reason}. Body: {resp.text}")

    payload = resp.json()

    # optional: fail fast if TAI returned a non-zero errorCode
    if payload.get("errorCode") not in (0, "0", None):
        raise RuntimeError(f"TAI errorCode={payload.get('errorCode')} msg={payload.get('errorMessage')}")

    return payload.get("data", [])