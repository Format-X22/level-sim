const fs = require('fs');
const request = require('request-promise-native');
const moment = require('moment');
const sleep = require('then-sleep');

const URL = 'https://www.bitmex.com/api/udf/history';
const MAX_TICKS_MUL = 10000 * 60;
const SAFE_TIME_MARGIN = 1000;
const STORAGE = 'data.json';

class Loader {
    async load(start, resolution) {
        this._resolution = resolution;
        this._from = +(start / 1000) | 0;
        this._to = this._nextChunk();
        this._stop = Date.now();
        this._resultHash = {};

        await this._cycle();
    }

    async _cycle() {
        while (true) {
            if (this._from > this._stop) {
                break;
            }

            let response;

            try {
                response = await request({
                    uri: URL,
                    qs: {
                        symbol: 'XBTUSD',
                        from: this._from,
                        to: this._to,
                        resolution: this._resolution,
                    },
                    json: true,
                });
            } catch (err) {
                await sleep(3000);
                console.log('fail');
                continue;
            }

            if (!response['t']) {
                console.log(response);
                break;
            }

            console.log(response['t'].length);

            for (let i = 0; i < response['t'].length; i++) {
                this._resultHash[response['t'][i]] = [
                    response['t'][i],
                    response['o'][i],
                    response['h'][i],
                    response['l'][i],
                    response['c'][i],
                ];
            }

            this._from = this._nextChunk();
            this._to = this._nextChunk();
        }

        fs.writeFileSync(`${__dirname}/${STORAGE}`, JSON.stringify(this._resultHash));
    }

    _nextChunk() {
        return this._from + MAX_TICKS_MUL * this._resolution - SAFE_TIME_MARGIN;
    }
}

new Loader().load(moment().add(-1, 'year'), 60).catch(error => {
    console.log(error);
});
