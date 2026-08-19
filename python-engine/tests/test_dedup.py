from engine.deduplicator import deduplicate
from models.place import PlaceRecord


def test_place_id_dedup():
    a = PlaceRecord(place_id="1", business_name="ABC", address="Okara")
    b = PlaceRecord(place_id="1", business_name="ABC", address="Okara")
    assert len(deduplicate([a, b])) == 1
