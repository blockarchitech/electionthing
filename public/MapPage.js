import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import osmtogeojson from 'osmtogeojson';
import 'leaflet/dist/leaflet.css';
import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import 'bootstrap/dist/css/bootstrap.min.css';

const StateNames = {
    'AL': 'Alabama',
    'AK': 'Alaska',
    'AZ': 'Arizona',
    'AR': 'Arkansas',
    'CA': 'California',
    'CO': 'Colorado',
    'CT': 'Connecticut',
    'DE': 'Delaware',
    'FL': 'Florida',
    'GA': 'Georgia',
    'HI': 'Hawaii',
    'ID': 'Idaho',
    'IL': 'Illinois',
    'IN': 'Indiana',
    'IA': 'Iowa',
    'KS': 'Kansas',
    'KY': 'Kentucky',
    'LA': 'Louisiana',
    'ME': 'Maine',
    'MD': 'Maryland',
    'MA': 'Massachusetts',
    'MI': 'Michigan',
    'MN': 'Minnesota',
    'MS': 'Mississippi',
    'MO': 'Missouri',
    'MT': 'Montana',
    'NE': 'Nebraska',
    'NV': 'Nevada',
    'NH': 'New Hampshire',
    'NJ': 'New Jersey',
    'NM': 'New Mexico',
    'NY': 'New York',
    'NC': 'North Carolina',
    'ND': 'North Dakota',
    'OH': 'Ohio',
    'OK': 'Oklahoma',
    'OR': 'Oregon',
    'PA': 'Pennsylvania',
    'RI': 'Rhode Island',
    'SC': 'South Carolina',
    'SD': 'South Dakota',
    'TN': 'Tennessee',
    'TX': 'Texas',
    'UT': 'Utah',
    'VT': 'Vermont',
    'VA': 'Virginia',
    'WA': 'Washington',
    'WV': 'West Virginia',
    'WI': 'Wisconsin',
    'WY': 'Wyoming'
}

const MapPage = () => {
    const [statesData, setStatesData] = useState([]);
    const [geoJsonData, setGeoJsonData] = useState({});
    const [selectedState, setSelectedState] = useState(null);
    const [clickedState, setClickedState] = useState(null);

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
                                    leader
                                }
                            }
                        }
                    `
                })
            });

            const result = await response.json();
            const statesDataWithPhotos = await Promise.all(result.data.states.map(async state => {
                const resultsWithPhotos = await Promise.all(state.results.map(async result => {
                    const photoResponse = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.candidate)}&prop=pageimages&format=json&pithumbsize=100&origin=*`);
                    const photoData = await photoResponse.json();
                    const pages = photoData.query.pages;
                    const page = Object.values(pages)[0];
                    const photoUrl = page.thumbnail ? page.thumbnail.source : '';
                    return {
                        ...result,
                        photo: photoUrl
                    };
                }));
                return {
                    ...state,
                    results: resultsWithPhotos
                };
            }));
            setStatesData(statesDataWithPhotos);

            const geoJsonPromises = result.data.states.map(async state => {
                if (state.state !== 'US') {
                    const response = await fetch(`https://overpass-api.de/api/interpreter?data=[out:json];relation["admin_level"="4"]["name"="${StateNames[state.state]}"];out geom;`);
                    const data = await response.json();
                    return {
                        state: StateNames[state.state],
                        geoJson: data
                    };
                }
                return null;
            });
            const geoJsonResults = await Promise.all(geoJsonPromises);
            
            const geoJsonMap = geoJsonResults.reduce((acc, result) => {
                if (result) {
                    acc[result.state] = result.geoJson;
                }
                return acc;
            }, {});
            
            Object.keys(geoJsonMap).forEach(key => {
                const stateName = Object.keys(StateNames).find(state => StateNames[state] === key);
                if (stateName) {
                    geoJsonMap[stateName] = geoJsonMap[key];
                    delete geoJsonMap[key];
                }
            });

            Object.keys(geoJsonMap).forEach(key => {
                const geoJson = osmtogeojson(geoJsonMap[key]);
                geoJsonMap[key] = geoJson;
            });

            setGeoJsonData(geoJsonMap);
        };

        fetchData();
    }, []);

    const getColor = (state) => {
        const demPercentage = state.results.filter(result => result.party === 'DEM').reduce((acc, result) => acc + result.percentage, 0);
        const repPercentage = state.results.filter(result => result.party === 'REP').reduce((acc, result) => acc + result.percentage, 0);
        const libPercentage = state.results.filter(result => result.party === 'LIB').reduce((acc, result) => acc + result.percentage, 0);
        const grePercentage = state.results.filter(result => result.party === 'GRE').reduce((acc, result) => acc + result.percentage, 0);

        const maxPercentage = Math.max(demPercentage, repPercentage, libPercentage, grePercentage);

        if (maxPercentage === demPercentage) {
            return `rgba(0, 0, 255, ${demPercentage / 100})`;
        } else if (maxPercentage === repPercentage) {
            return `rgba(255, 0, 0, ${repPercentage / 100})`;
        } else if (maxPercentage === libPercentage) {
            return `rgba(255, 215, 0, ${libPercentage / 100})`; // Gold color for LIB
        } else {
            return `rgba(0, 128, 0, ${grePercentage / 100})`; // Green color for GRE
        }
    };

    const onEachFeature = (feature, layer) => {
        const stateName = Object.keys(StateNames).find(state => StateNames[state] === feature.properties.name);
        const stateData = statesData.find(state => state.state === stateName);

        if (stateData) {
            layer.on({
                mouseover: () => {
                    setSelectedState(stateData);
                },
                mouseout: () => {
                    if (clickedState !== stateData) {
                        setSelectedState(null);
                    }
                },
                click: () => {
                    setSelectedState(stateData);
                    setClickedState(stateData);
                }
            });
        }
    };

    return (
        <div className="d-flex" style={{ height: '100vh' }}>
            <div className="p-3" style={{ width: '400px' }}>
                <h4>US Election Polls</h4>
                {selectedState && (
                    <div>
                        <h5>{StateNames[selectedState.state]}</h5>
                        <div>
                            {selectedState.results.map(result => (
                                <div key={result.candidate} className="d-flex align-items-center mb-2">
                                    <img src={result.photo} alt={result.candidate} style={{ width: '50px', height: '50px', borderRadius: '50%' }} />
                                    <p className="mb-0 ml-2">{result.candidate} ({result.party})</p>
                                </div>
                            ))}
                        </div>
                        <div style={{ width: '200px', height: '200px' }}>
                            <Pie
                                data={{
                                    labels: selectedState.results.map(result => result.candidate),
                                    datasets: [{
                                        data: selectedState.results.map(result => result.percentage),
                                        backgroundColor: selectedState.results.map(result => {
                                            switch (result.party) {
                                                case 'DEM': return 'blue';
                                                case 'REP': return 'red';
                                                case 'LIB': return 'gold';
                                                case 'GRE': return 'green';
                                                default: return 'gray';
                                            }
                                        }),
                                        borderWidth: 0
                                    }]
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
            <MapContainer style={{ height: '100%', width: '100%' }} zoom={4} center={[37.8, -96]}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {statesData.map(state => (
                    state.state !== 'US' && geoJsonData[state.state] ? (
                        <GeoJSON
                            key={state.state}
                            data={geoJsonData[state.state]}
                            style={() => ({
                                fillColor: getColor(state),
                                weight: 0,
                                opacity: 1,
                                fillOpacity: 0.7
                            })}
                            onEachFeature={onEachFeature}
                            pointToLayer={() => null}

                        />
                    ) : null
                ))}
            </MapContainer>
        </div>
    );
};

ReactDOM.render(<MapPage />, document.getElementById('root'));
