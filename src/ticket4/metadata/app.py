


from http import HTTPStatus
from flask import request
from flask_restx import Resource

from app.tai_client import get_user_department  # adjust import to your layout

@api.route("/user-metadata/<env>")
class UserMetadataResource(Resource):
    def get(self, env: str):
        raw_ids = request.args.get("ids", "")
        user_ids = [uid.strip() for uid in raw_ids.split(",") if uid.strip()]

        if not user_ids:
            return {"message": "ids query parameter is required"}, HTTPStatus.BAD_REQUEST

        try:
            rows = get_user_department(env, user_ids)
        except ValueError as e:
            return {"message": str(e)}, HTTPStatus.BAD_REQUEST
        except Exception as e:
            # Return real error (at least until stable). You can later swap to logging only.
            return {"message": f"Failed to retrieve user metadata: {e}"}, HTTPStatus.INTERNAL_SERVER_ERROR

        # Build response: { userId: { department: "..." } }
        result = {}
        for row in rows:
            # Match your columns in tai_client columns=
            user_id = row.get("user.user")
            if not user_id:
                continue

            result[user_id] = {"department": row.get("user.division")}

        return {"metadata": result}, HTTPStatus.OK
    
    curl "http://localhost:5173/user-metadata/QA?ids=12345;67890"
    curl -v "http://localhost:8081/user-metadata/QA?ids=user1,user2"