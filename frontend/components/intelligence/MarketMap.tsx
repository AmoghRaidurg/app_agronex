import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import type { NearbyMarket } from '../../lib/aiApi';

const { height } = Dimensions.get('window');

interface Props {
  markets: NearbyMarket[];
  userLat: number;
  userLng: number;
  onMarketTap?: (market: NearbyMarket) => void;
}

export function MarketMap({ markets, userLat, userLng }: Props) {
  const html = useMemo(() => {
    const markers = markets
      .map(
        (m) =>
          `L.marker([${m.latitude}, ${m.longitude}]).addTo(map).bindPopup('<b>${m.name}</b><br/>${m.crop}: ₹${m.price}/${m.unit}<br/>${m.distance_km} km · ~${m.travel_time_min} min');`,
      )
      .join('\n');

    return `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>html,body,#map{margin:0;height:100%;}</style>
    </head><body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([${userLat}, ${userLng}], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);
        L.circleMarker([${userLat}, ${userLng}], {radius:8, color:'#16a34a', fillColor:'#16a34a', fillOpacity:0.9})
          .addTo(map).bindPopup('Your location');
        ${markers}
      </script>
    </body></html>`;
  }, [markets, userLat, userLng]);

  return (
    <View style={styles.wrap}>
      <WebView
        source={{ html }}
        style={styles.web}
        scrollEnabled={false}
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: height * 0.4, borderRadius: 16, overflow: 'hidden', marginVertical: 12 },
  web: { flex: 1 },
});
