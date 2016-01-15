// adapted from: https://github.com/runarberg/markdown-it-math

const inlineMark = '$';
const inlineMarkLen = inlineMark.length;

const blockMark = '$$';
const blockMarkLen = blockMark.length;

function scanDelims(state, start, delimLength) {
    /*eslint camelcase: 0*/
    let pos = start, lastChar, nextChar, count, can_open, can_close,
        isLastWhiteSpace, isLastPunctChar,
        isNextWhiteSpace, isNextPunctChar,
        left_flanking = true,
        right_flanking = true,
        max = state.posMax,
        isWhiteSpace = state.md.utils.isWhiteSpace,
        isPunctChar = state.md.utils.isPunctChar,
        isMdAsciiPunct = state.md.utils.isMdAsciiPunct;

    // treat beginning of the line as a whitespace
    lastChar = start > 0 ? state.src.charCodeAt(start - 1) : 0x20;

    if (pos >= max) {
        can_open = false;
    }

    pos += delimLength;

    count = pos - start;

    // treat end of the line as a whitespace
    nextChar = pos < max ? state.src.charCodeAt(pos) : 0x20;

    isLastPunctChar = isMdAsciiPunct(lastChar) || isPunctChar(String.fromCharCode(lastChar));
    isNextPunctChar = isMdAsciiPunct(nextChar) || isPunctChar(String.fromCharCode(nextChar));

    isLastWhiteSpace = isWhiteSpace(lastChar);
    isNextWhiteSpace = isWhiteSpace(nextChar);

    if (isNextWhiteSpace) {
        left_flanking = false;
    } else if (isNextPunctChar) {
        if (!(isLastWhiteSpace || isLastPunctChar)) {
            left_flanking = false;
        }
    }

    if (isLastWhiteSpace) {
        right_flanking = false;
    } else if (isLastPunctChar) {
        if (!(isNextWhiteSpace || isNextPunctChar)) {
            right_flanking = false;
        }
    }

    can_open = left_flanking;
    can_close = right_flanking;

    return {
        can_open: can_open,
        can_close: can_close,
        delims: count
    };
}

function factory(marker, markTag, markLen) {
    return function markMathInline(state, silent) {
        let startCount,
            found,
            res,
            token,
            closeDelim,
            max = state.posMax,
            start = state.pos,
            openDelim = state.src.slice(start, start + markLen);

        if (openDelim !== markTag) { return false; }
        if (silent) { return false; }    // Don’t run any pairs in validation mode

        res = scanDelims(state, start, markLen);
        startCount = res.delims;

        if (!res.can_open) {
            state.pos += startCount;
            // Earlier we checked !silent, but this implementation does not need it
            state.pending += state.src.slice(start, state.pos);
            return true;
        }

        state.pos = start + markLen;

        while (state.pos < max) {
            closeDelim = state.src.slice(state.pos, state.pos + markLen);
            if (closeDelim === markTag) {
                res = scanDelims(state, state.pos, markLen);
                if (res.can_close) {
                    found = true;
                    break;
                }
            }

            state.md.inline.skipToken(state);
        }

        if (!found) {
            // Parser failed to find ending tag, so it is not a valid math
            state.pos = start;
            return false;
        }

        // Found!
        state.posMax = state.pos;
        state.pos = start + markLen;

        // Earlier we checked !silent, but this implementation does not need it
        token = state.push(marker, 'math', 0);
        token.content = state.src.slice(state.pos, state.posMax);
        token.markup = markTag;

        state.pos = state.posMax + markLen;
        state.posMax = max;

        return true;
    };
}

module.exports = function(md) {

    md.inline.ruler.before('escape', 'mathjax_inline', factory('mathjax_inline', inlineMark, inlineMarkLen));

    md.inline.ruler.before('mathjax_inline', 'mathjax_block', factory('mathjax_block', blockMark, blockMarkLen));

    md.renderer.rules.mathjax_inline = function (tokens, idx /*, options, env */) {
        return `${inlineMark}${tokens[idx].content}${inlineMark}`;
    };

    md.renderer.rules.mathjax_block = function (tokens, idx /*, options, env */) {
        return `${blockMark}${tokens[idx].content}${blockMark}`;
    };
};
