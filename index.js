import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema } from 'graphql';
import fetch from 'node-fetch';
import cors from 'cors';

const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
let cache = {
    data: null,
    timestamp: null
};

const getElectionResults = async () => {
    const now = Date.now();

    // Check if we have cached data and it's still valid
    if (cache.data && (now - cache.timestamp < CACHE_TTL)) {
        console.log('Returning cached data');
        return cache.data;
    }

    // Fetch new data from NYT API
    const response = await fetch('https://static01.nytimes.com/newsgraphics/2023-polling-averages/418de109-7a6f-407f-b32e-ef0d2290c293/_assets/data/harris/interactive/2024/us/elections/polls-president/polls-0.json');
    const data = await response.json();

    // Process the data
    const states = {};
    data.polls.forEach(poll => {
        if (!states[poll.geo]) {
            states[poll.geo] = [];
        }
        const state = states[poll.geo];
        const latestPoll = state[state.length - 1];
        if (!latestPoll || latestPoll.ready_at < poll.ready_at) {
            const results = poll.results.map(result => {
                return {
                    candidate: result.candidate_name,
                    percentage: result.pct,
                    date: poll.ready_at,
                    leader: result.leader,
                    pollster: poll.pollster,
                    sample_size: poll.sample_size
                };
            });
            state.push(...results);
        }
    });

    const results = [];
    for (const state in states) {
        const stateResults = states[state];
        results.push({
            state: state,
            results: stateResults
        });
    }

    // sort states alphabetically
    results.sort((a, b) => a.state.localeCompare(b.state));

    // Update the cache
    cache = {
        data: results,
        timestamp: now
    };

    return results;
};

const getStateBoundaries = async (state) => {
    const query = `
        [out:json];
        relation["admin_level"="4"]["name"="${state}"];
        out body;
        >;
        out skel qt;
    `;
    const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
    });
    const data = await response.json();
    const coordinates = data.elements
        .filter(element => element.type === 'way')
        .flatMap(element => element.geometry.map(coord => [coord.lon, coord.lat]));
    return coordinates;
};

const schema = buildSchema(`
    type Result {
        candidate: String
        percentage: Int
        date: String
        leader: Boolean
        pollster: String
        sample_size: Int
    }

    type State {
        state: String
        results: [Result]
    }

    type StateBoundary {
        state: String
        boundaries: [Float]
    }

    type Query {
        states: [State]
        state(state: String!): State
        results: [Result]
        result(candidate: String!): Result
        stateBoundaries(state: String!): StateBoundary
    }
`);

const root = {
    states: async () => {
        return await getElectionResults();
    },
    state: async ({ state }) => {
        const results = await getElectionResults();
        return results.find(s => s.state === state);
    },
    results: async () => {
        const results = await getElectionResults();
        return results.flatMap(s => s.results);
    },
    result: async ({ candidate }) => {
        const results = await getElectionResults();
        return results.flatMap(s => s.results).find(r => r.candidate === candidate);
    },
    stateBoundaries: async ({ state }) => {
        const boundaries = await getStateBoundaries(state);
        return { state, boundaries };
    }
};

const app = express();
app.use(cors());
app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true
}));

app.use(express.static('public'));

app.listen(4000, () => {
    console.log('Running a GraphQL API server at http://localhost:4000/graphql');
});
