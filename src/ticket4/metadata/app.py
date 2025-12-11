from http import HTTPStatus
from flask import request
from flask_restx import Resource

from .tai_client import get_user_department
from .models import Environment
from .ldap import is_authorized
from .app_api import api


@api.route("/user-metadata/<env>")
class UserMetadataResource(Resource):
    @is_authorized
    def get(self, env: Environment):
        """
        Returns department metadata for a list of userIds.
        Example: GET /user-metadata/QA?ids=123;456;789
        """
        raw_ids = request.args.get("ids", "")
        user_ids = [uid for uid in raw_ids.split(";") if uid]

        if not user_ids:
            return {"message": "ids query parameter is required"}, HTTPStatus.BAD_REQUEST

        try:
            rows = get_user_department(env.value, user_ids)
        except ValueError as e:
            return {"message": str(e)}, HTTPStatus.BAD_REQUEST
        except Exception:
            # log the error properly in your codebase
            return {"message": "Failed to retrieve user metadata"}, HTTPStatus.INTERNAL_SERVER_ERROR

        # Shape: { userId: { department: "..." } }
        result = {}
        for row in rows:
            # adjust keys to match your TAI JSON structure
            user_id = row.get("user.eon_id")
            if not user_id:
                continue
            result[user_id] = {
                "department": row.get("user.division")
            }

        return {"metadata": result}, HTTPStatus.OK
    
    curl "http://localhost:5173/user-metadata/QA?ids=12345;67890"