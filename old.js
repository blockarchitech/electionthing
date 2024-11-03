// election thing
// from nyt api

// e.g. get presidential results for specific state:
// https://static01.nytimes.com/newsgraphics/2023-polling-averages/418de109-7a6f-407f-b32e-ef0d2290c293/_assets/data/harris/interactive/2024/us/elections/polls-president-pennsylvania/polls-0.json
// e.g. get presidential results for all states:
// https://static01.nytimes.com/newsgraphics/2023-polling-averages/418de109-7a6f-407f-b32e-ef0d2290c293/_assets/data/harris/interactive/2024/us/elections/polls-president/polls-0.json

// return a list of states, and who is leading as a percentage in each state

import fetch from 'node-fetch';

const getElectionResults = async () => {
    const response = await fetch('https://static01.nytimes.com/newsgraphics/2023-polling-averages/418de109-7a6f-407f-b32e-ef0d2290c293/_assets/data/harris/interactive/2024/us/elections/polls-president/polls-0.json');
    const data = await response.json();
    // we care about the stuff in data.polls
    // example poll entry:
    /*
    {
            "pollster": "AtlasIntel",
            "sponsors": [],
            "pollster_partisan": null,
            "sponsoring_candidate_name": null,
            "sponsoring_candidate_party": null,
            "geo": "NV",
            "margin": 6,
            "start_date": "2024-11-01",
            "end_date": "2024-11-02",
            "results": [
                {
                    "answer": "Trump",
                    "candidate_name": "Donald Trump",
                    "party": "REP",
                    "pct": 52,
                    "leader": true
                },
                {
                    "answer": "Harris",
                    "candidate_name": "Kamala Harris",
                    "party": "DEM",
                    "pct": 46,
                    "leader": false
                }
            ],
            "population": "lv",
            "sample_size": 782,
            "race_type": "G",
            "ready_at": "2024-11-02 20:36:00",
            "is_select": true,
            "url": "https://projects.fivethirtyeight.com/polls/20241102_SwingStates_AtlasIntel.pdf",
            "office_type": "P",
            "nyt_race_id": "NV-G-P-2024-11-05",
            "nyt_matchup_id": "NV-G-P-2024-11-05-harrisk-trumpd-prefer-h2h",
            "fte_question_id": 215786,
            "matchup_type": "harrisk-trumpd-prefer-h2h",
            "matchup_id": "harrisk-trumpd-prefer-h2h",
            "is_partisan": false,
            "poll_weight_no_time_decay": 0.3149
        },
    */
    // crunch the data like this:
    // for each state, get the leading candidate and the percentage of votes they have ("pct")
    // create a timeline of this data, so the latest data is at the end for each state. for example:
    // {
    //     "state": "NV",
    //     "results": [
    //         {
    //             "candidate": "Donald Trump",
    //             "percentage": 52,
    //             "date": "2024-11-02"
    //             "leader": true
    //         },
    //         {
    //             "candidate": "Kamala Harris",
    //             "percentage": 46,
    //             "date": "2024-11-02"
    //             "leader": false
    //         }
    //   ]
    // }
    // use the "ready_at" field to determine the latest data.
    // note: each state may have multiple entries, so you need to aggregate them.
    // note 2: each poll may have multiple entries, so you need to aggregate them.

    // log all states (poll.geo)
    let statecount = [];
    data.polls.forEach(poll => {
        
        if (!statecount.includes(poll.geo)) {
            statecount.push(poll.geo);
            console.log(poll.geo);
        }
        
    });
    console.log(`total states: ${statecount.length}`);

    const states = {};
    data.polls.forEach(poll => {
        if (!states[poll.geo]) {
            // new state
            console.log(`new state: ${poll.geo}`);
            states[poll.geo] = [];
        }
        const state = states[poll.geo];
        const latestPoll = state[state.length - 1];
        if (!latestPoll || latestPoll.ready_at < poll.ready_at) {
            // this is the latest poll
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
    console.log("states we ended up with:" + results.length);
    return results;



}