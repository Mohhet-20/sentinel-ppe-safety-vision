import pytest

from app.services.zone_service import point_in_polygon, bbox_center

SQUARE = [{"x": 0.0, "y": 0.0}, {"x": 1.0, "y": 0.0}, {"x": 1.0, "y": 1.0}, {"x": 0.0, "y": 1.0}]


def test_point_inside_polygon():
    assert point_in_polygon((0.5, 0.5), SQUARE) is True


def test_point_outside_polygon():
    assert point_in_polygon((1.5, 0.5), SQUARE) is False


def test_point_in_polygon_with_too_few_points():
    assert point_in_polygon((0.5, 0.5), [{"x": 0, "y": 0}, {"x": 1, "y": 1}]) is False


def test_bbox_center():
    center = bbox_center({"x": 0.2, "y": 0.2, "w": 0.2, "h": 0.2})
    assert center == pytest.approx((0.3, 0.3))
