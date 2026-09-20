import sys, json
sys.path.insert(0, '.')
from backend.services.map_layers_service import fetch_layer

roi = {
    'type': 'Polygon',
    'coordinates': [[[76.9, 26.9], [76.9, 26.95], [76.95, 26.95], [76.95, 26.9], [76.9, 26.9]]]
}

for layer in ['water', 'roads', 'vegetation', 'buildings']:
    try:
        res = fetch_layer(layer, roi)
        geojson = res.get('geojson', {})
        features = geojson.get('features', [])
        print(f'Layer: {layer} -> {len(features)} features')
        if features:
            print(f'  First feature geometry type: {features[0]["geometry"]["type"]}')
            # Print first 2 coordinates of first feature
            coords = features[0]["geometry"]["coordinates"]
            print(f'  First feature coords structure: {type(coords)}, length: {len(coords)}')
    except Exception as e:
        print(f'Layer: {layer} -> ERROR: {e}')
