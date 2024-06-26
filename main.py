from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from bson.regex import Regex
import logging
from fastapi.responses import FileResponse
import os
from fastapi.middleware.cors import CORSMiddleware

# Helper class for handling MongoDB ObjectId types in Pydantic models
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# Pydantic models to validate the data
class Item(BaseModel):
    roomNo: int
    bookings: Optional[List]
    facility: Optional[List[str]]
    capacity: Optional[int]
    Img:Optional[str]

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }

class Booking(BaseModel):
    m: int
    d: int
    y: int
    time: str
    user:str

class ItemUpdate(BaseModel):
    roomNo: Optional[int] = Field(None, example=1)
    bookings: Optional[List[Booking]]
    facility: Optional[List[str]]
    capacity: Optional[int]
    Img:Optional[str]


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this to specify the allowed origins, e.g., ["http://localhost", "http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE","PATCH"],  # Update this to specify the allowed HTTP methods
    allow_headers=["*"],  # Update this to specify the allowed headers
)
# Database client setup
client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client.roombooking

@app.on_event("startup")
async def startup_event():
    app.mongodb_client = client
    app.mongodb = db
    await db.rooms.create_index([("roomNo", 1), ("facility", 1), ("capacity", 1)])



@app.on_event("shutdown")
async def shutdown_event():
    app.mongodb_client.close()

@app.post("/addroom/", response_model=Item, status_code=201)
async def create_item(item: Item):
    result = await db.rooms.insert_one(item.dict(by_alias=True))
    if result.inserted_id:
        item = await db.rooms.find_one({"_id": result.inserted_id})
        return item
    else:
        raise HTTPException(status_code=500, detail="An error occurred while inserting the item.")

@app.patch("/updateroom/{roomNo}", response_model=Item)
async def update_room(roomNo: int, update: ItemUpdate):
    result = await db.rooms.update_one({"roomNo": roomNo}, {"$set": update.dict(exclude_unset=True)})
    if result.modified_count:
        updated_room = await db.rooms.find_one({"roomNo": roomNo})
        return updated_room
    else:
        raise HTTPException(status_code=404, detail="Room not found or no update made.")

@app.get("/getroom/{roomNo}", response_model=Item)
async def get_room_by_roomNo(roomNo: int):
    room = await db.rooms.find_one({"roomNo": roomNo})
    if room:
        return room
    else:
        raise HTTPException(status_code=404, detail="Room not found.")


@app.get("/allrooms/", response_model=List[Item])
async def search_rooms():
    rooms = await db.rooms.find({}).to_list(length=100)
    return rooms


@app.get("/searchrooms/", response_model=List[Item])
async def search_rooms(query_text: str = Query(..., alias="q")):
    if not query_text:
        raise HTTPException(status_code=400, detail="Query text is required.")

    query = {}

    if query_text.isdigit():
          query["$or"] = [
            {"roomNo": int(query_text)},
            {"capacity": int(query_text)}
        ]
    else:
        query["facility"] = {"$elemMatch": {"$regex": f".*{query_text}.*", "$options": "i"}}

    rooms = await db.rooms.find(query).to_list(length=100)
    return rooms


@app.get("/images/{image_name}", response_class=FileResponse)
async def get_image(image_name: str):
    image_path = os.path.join("images", image_name)
    if os.path.isfile(image_path):
        return FileResponse(image_path)
    else:
        raise HTTPException(status_code=404, detail="Image not found.")