from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_caching import Cache
import redis

cache = Cache()
redis_client = None

db = SQLAlchemy()
migrate = Migrate()

def init_redis():
    global redis_client
    redis_client = redis.from_url(app.config.get('REDIS_URL'))