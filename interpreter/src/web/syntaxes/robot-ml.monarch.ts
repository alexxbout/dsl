// Monarch syntax highlighting for the robot-ml language.
export default {
    keywords: [
        'Backward','Clock','Forward','Left','Right','and','boolean','cm','false','getDistance()','in','let','loop','mm','number','or','return','setSpeed','true','var','void'
    ],
    operators: [
        '!=','%','*','+',',','-','/','<','<=','=','==','>','>='
    ],
    symbols: /!=|%|\(|\)|\*|\+|,|-|\/|<|<=|=|==|>|>=|\{|\}/,

    tokenizer: {
        initial: [
            { regex: /[_a-zA-Z][\w_]*/, action: { cases: { '@keywords': {"token":"keyword"}, '@default': {"token":"ID"} }} },
            { regex: /[0-9]+/, action: {"token":"number"} },
            { include: '@whitespace' },
            { regex: /@symbols/, action: { cases: { '@operators': {"token":"operator"}, '@default': {"token":""} }} },
        ],
        whitespace: [
            { regex: /\s+/, action: {"token":"white"} },
            { regex: /\/\*/, action: {"token":"comment","next":"@comment"} },
            { regex: /\/\/[^\n\r]*/, action: {"token":"comment"} },
        ],
        comment: [
            { regex: /[^/\*]+/, action: {"token":"comment"} },
            { regex: /\*\//, action: {"token":"comment","next":"@pop"} },
            { regex: /[/\*]/, action: {"token":"comment"} },
        ],
    }
};
