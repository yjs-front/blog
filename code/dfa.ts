class DFA {
    sensitiveMap: Map<string, any>;

    /**
     * 构建敏感词库
     *
     * @param {Array<string>} sensitiveWordList
     * @memberof DFA
     */
    public genSensitiveWordHashMap(sensitiveWordList: Array<string>): void {
        if (this.sensitiveMap) {
            console.log('rebuild map');
        }
        // 构造根节点
        this.sensitiveMap = new Map();
        for (const word of sensitiveWordList) {
            this._insertWord(word);
        }

    }

    /**
     * 往敏感词库添加单词
     *
     * @private
     * @param {*} word
     * @memberof DFA
     */
    private _insertWord(word) {
        let nowMap: Map<string, any> = this.sensitiveMap;
        // 依次获取字
        for (let i = 0; i < word.length; i++) {
            const char = word.charAt(i);
            const wordMap: Map<string, any> = nowMap.get(char);

            if (wordMap) { //如果存在该key，直接赋值  
                nowMap = wordMap;
            } else { //不存在则，则构建一个map，同时将isEnd设置为0，因为他不是最后一个  
                nowMap.set('laster', false);

                let newMap = new Map<string, any>();
                newMap.set('laster', true);

                nowMap.set(char, newMap);
                nowMap = nowMap.get(char);
            }
        }
    }


    /**
     * 配置词库
     *
     * @param {*} word
     * @returns {{ match: boolean, word?: string, everMatch?: boolean }} {{ match: 是否匹配, word?: 匹配敏感词, everMatch?: 是否匹配到一半的敏感词 }}
     * @memberof DFA
     */
    public matchSensitive(word): { match: boolean, word?: string, everMatch?: boolean } {
        let result = false;

        if (!this.sensitiveMap) {
            return { match: result };
        }
        // 过滤单词
        let nowMap = this.sensitiveMap;
        let matchWord = '';
        let everMatch = false;

        for (let i = 0; i < word.length; i++) {
            const char = word.charAt(i);
            const wordMap: Map<string, any> = nowMap.get(char);
            if (wordMap) {
                everMatch = true;
                if (wordMap.get('laster') === true) {
                    matchWord += char;
                    result = true;
                    break;
                }
                nowMap = wordMap;
                matchWord += char;
            } else {
                result = false;
            }
        }

        return {
            match: result,
            word: result ? matchWord : '',
            everMatch: !result ? everMatch : false
        };

    }

}

function matchSensitive(map: DFA, word: string) {
    let match = false;
    const result = map.matchSensitive(word);
    if (result.match === false && result.everMatch === true) {
        return matchSensitive(map, word.slice(1, word.length));
    } else if (result.match === true) {
        match = true;
    }
    return match;
}

const map = new DFA();
const sensitiveWordList = ['中国人民', '国万', '日本男人'];

map.genSensitiveWordHashMap(sensitiveWordList);
const word = '中国万睡';
const result = matchSensitive(map, word);

const word2 = '日本万睡，国万';
const result2 = matchSensitive(map, word);