import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MapPage = () => {
    const [statesData, setStatesData] = useState([]);
    const [hoveredState, setHoveredState] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            const response = await fetch('/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: `
                        query {
                            states {
                                state
                                results {
                                    candidate
                                    percentage
                                    party
                                }
                            }
                        }
                    `
                })
            });
            const result = await response.json();
            setStatesData(result.data.states);
        };

        fetchData();
    }, []);

    const getColor = (state) => {
        const demPercentage = state.results.filter(result => result.party === 'DEM').reduce((acc, result) => acc + result.percentage, 0);
        const repPercentage = state.results.filter(result => result.party === 'REP').reduce((acc, result) => acc + result.percentage, 0);
        if (demPercentage > repPercentage) {
            return `rgba(0, 0, 255, ${demPercentage / 100})`;
        } else {
            return `rgba(255, 0, 0, ${repPercentage / 100})`;
        }
    };

    const onEachFeature = (feature, layer) => {
        layer.on({
            mouseover: (e) => {
                setHoveredState(feature.properties.name);
                layer.setStyle({
                    weight: 5,
                    color: '#666',
                    dashArray: '',
                    fillOpacity: 0.7
                });
            },
            mouseout: (e) => {
                setHoveredState(null);
                layer.setStyle({
                    weight: 2,
                    color: '#3388ff',
                    dashArray: '3',
                    fillOpacity: 0.2
                });
            }
        });
    };

    return (
        <div style={{ backgroundColor: '#333', color: '#fff', height: '100vh' }}>
            <MapContainer style={{ height: '100%', width: '100%' }} zoom={4} center={[37.8, -96]}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {statesData.map(state => (
                    <GeoJSON
                        key={state.state}
                        data={state}
                        style={() => ({
                            fillColor: getColor(state),
                            weight: 2,
                            opacity: 1,
                            color: 'white',
                            dashArray: '3',
                            fillOpacity: 0.7
                        })}
                        onEachFeature={onEachFeature}
                    />
                ))}
            </MapContainer>
            {hoveredState && (
                <div style={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#fff', color: '#000', padding: '10px', borderRadius: '5px' }}>
                    <h4>{hoveredState}</h4>
                    <p>Leading Candidate: {statesData.find(state => state.state === hoveredState).results.find(result => result.leader).candidate}</p>
                    <p>Percentage: {statesData.find(state => state.state === hoveredState).results.find(result => result.leader).percentage}%</p>
                </div>
            )}
        </div>
    );
};

export default MapPage;
