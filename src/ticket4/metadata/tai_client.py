# app/tai_client.py
from typing import List, Dict
import requests
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

def get_user_department(env: str, user_ids: List[str]) -> List[Dict]:
    """
    Calls TAI and returns raw rows for the given user IDs.
    Adjust dataset/columns/filter to your real TAI setup.
    """
    if not user_ids:
        return []

    base_url = _get_base_url(env)

    dataset = "user"  # TODO: real dataset name
    columns = "user.eon_id,user.division"  # TODO: real column names

    # f=user.eon_id=ID1;ID2;ID3
    filter_value = ";".join(user_ids)
    filter_expr = f"user.eon_id={filter_value}"

    url = (
        f"{base_url}.json/{dataset}"
        f"?c={columns}"
        f"&f={filter_expr}"
    )

    response = requests.get(url, auth=HTTPKerberosAuth(principal=""), timeout=60)
    response.raise_for_status()
    payload = response.json()
    return payload.get("data", [])