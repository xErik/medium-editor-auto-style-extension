var XRegExp = require('xregexp');

function nodeIsNotInsideAnchorTag(node) {
    return !MediumEditor.util.getClosestTag(node, 'a');
}

var AutoStyleExtension = MediumEditor.Extension.extend({
    // This config is here for documentary reasons.
    // It will be overwritten upon initialization of AutoStyleExtension.
    config: {
        sectionA: {
            matchcase: false,
            wordsonly: false,
            class: 'red-border',
            words: ['yellöw']
        },
        sectionB: {
            matchcase: true,
            wordsonly: true,
            style: 'color:green;background-color:red;',
            words: ['RED']
        },
        sectionC: {
            matchcase: false,
            wordsonly: false,
            style: 'background-color:gray;',
            words: ['gray', 'grey']
        },
        sectionD: {
            matchcase: true,
            wordsonly: true,
            style: 'background-color:orange;',
            words: ['oraNGE']
        }
    },
    getConfig: function() {
        return this.config;
    },
    removeConfigSection: function(sectionName) {
        delete this.config[sectionName];
        this.processConfig();
    },
    setConfigSection: function(sectionName, sectionObject) {
        this.config[sectionName] = sectionObject;
        this.processConfig();
    },
    processConfig: function() {
        this.regexColors = [];
        var sectionKeys = Object.keys(this.config);
        for (var k = 0; k < sectionKeys.length; k++) {

            var sectionKey = sectionKeys[k];
            var section = this.config[sectionKey];
            var matchcase = section.matchcase === true ? 'g' : 'gi';
            var wordsonly = section.wordsonly === true ? ['(\\P{L}|^)', '(\\P{L}|$)'] : ['', ''];
            var words = wordsonly[0] + '(' + section.words.join('|') + ')' + wordsonly[1];
            this.regexColors.push({
                style: section.style,
                clazz: section.class,
                regex: new XRegExp(words, matchcase)
            });
        }
        this.getEditorElements().forEach(function(el) {
            this.performStyling(el);
        }, this);
    },
    regexColors: [],
    init: function() {
        MediumEditor.Extension.prototype.init.apply(this, arguments);
        this.disableEventHandling = false;

        this.processConfig();

        this.subscribe('editableKeypress', this.onKeypress.bind(this));
        this.subscribe('editableBlur', this.onBlur.bind(this));
    },

    onBlur: function(blurEvent, editable) {
        this.performStyling(editable);
    },

    onKeypress: function(keyPressEvent) {
        if (this.disableEventHandling) {
            return;
        }

        if (MediumEditor.util.isKey(keyPressEvent, [MediumEditor.util.keyCode.TAB, MediumEditor.util.keyCode.DELETE, MediumEditor.util.keyCode.SPACE, MediumEditor.util.keyCode.ENTER])) {
            clearTimeout(this.performStylingTimeout);
            // Saving/restoring the selection in the middle of a keypress doesn't work well...
            this.performStylingTimeout = setTimeout(function() {
                try {
                    var sel = this.base.exportSelection();
                    if (this.performStyling(keyPressEvent.target)) {
                        // pass true for favorLaterSelectionAnchor - this is needed for links at the end of a
                        // paragraph in MS IE, or MS IE causes the link to be deleted right after adding it.
                        this.base.importSelection(sel, true);
                    }
                } catch (e) {
                    if (window.console) {
                        window.console.error('Failed to perform styling', e);
                    }
                    this.disableEventHandling = true;
                }
            }.bind(this), 0);
        }
    },

    performStyling: function(contenteditable) {
        /*
        Perform styling on blockElement basis, blockElements are HTML elements with text content and without
        child element.
        Example:
        - HTML content
        <blockquote>
          <p>link.</p>
          <p>my</p>
        </blockquote>
        - blockElements
        [<p>link.</p>, <p>my</p>]
        otherwise the detection can wrongly find the end of one paragraph and the beginning of another paragraph
        to constitute a link, such as a paragraph ending "link." and the next paragraph beginning with "my" is
        interpreted into "link.my" and the code tries to create a link across blockElements - which doesn't work
        and is terrible.
        (Medium deletes the spaces/returns between P tags so the textContent ends up without paragraph spacing)
        */
        var blockElements = MediumEditor.util.splitByBlockElements(contenteditable),
            documentModified = false;

        if (blockElements.length === 0) {
            blockElements = [contenteditable];
        }
        for (var i = 0; i < blockElements.length; i++) {
            documentModified = this.unwrapAutoStyleSpans(blockElements[i]) || documentModified;
            documentModified = this.performStylingWithinElement(blockElements[i]) || documentModified;
        }
        this.base.events.updateInput(contenteditable, {
            target: contenteditable,
            currentTarget: contenteditable
        });
        return documentModified;
    },

    unwrapAutoStyleSpans: function(element) {
        if (!element || element.nodeType === 3) {
            return false;
        }

        var spans = element.querySelectorAll('span[data-auto-style="true"]'),
            documentModified = false;

        for (var i = 0; i < spans.length; i++) {
            MediumEditor.util.unwrap(spans[i], this.document);
            documentModified = true;
        }

        return documentModified;
    },

    performStylingWithinElement: function(element) {
        var matches = this.findStyleableText(element),
            linkCreated = false;

        for (var matchIndex = 0; matchIndex < matches.length; matchIndex++) {
            var matchingTextNodes = MediumEditor.util.findOrCreateMatchingTextNodes(this.document, element,
                matches[matchIndex]);
            if (this.shouldNotStyle(matchingTextNodes)) {
                continue;
            }
            this.createAutoStyle(matchingTextNodes, matches[matchIndex].style, matches[matchIndex].clazz);
        }
        return linkCreated;
    },

    shouldNotStyle: function(textNodes) {
        var shouldNotStyle = false;
        for (var i = 0; i < textNodes.length && shouldNotStyle === false; i++) {
            shouldNotStyle = MediumEditor.util.traverseUp(textNodes[i], function(node) {
                return node.nodeName.toLowerCase() === 'span' &&
                    node.getAttribute && node.getAttribute('data-auto-style') === 'true';
            });
        }
        return shouldNotStyle;
    },

    findStyleableText: function(contenteditable) {
        var textContent = contenteditable.textContent,
            match = null,
            matches = [];

        for (var i = 0; i < this.regexColors.length; i++) {
            var rc = this.regexColors[i];
            var style = rc.style;
            var clazz = rc.clazz;
            var linkRegExp = rc.regex;

            while ((match = linkRegExp.exec(textContent)) !== null) {

                if (match.length === 2) {
                    // wordsonly: false
                    var matchEnd = match.index + match[0].length;
                    matches.push({
                        clazz: clazz,
                        style: style,
                        start: match.index,
                        end: matchEnd
                    });
                } else if (match.length === 4) {
                    // wordsonly: true
                    var start = match.index + match[1].length;
                    var end = start + match[2].length;
                    matches.push({
                        clazz: clazz,
                        style: style,
                        start: start,
                        end: end
                    });
                } else {
                    if (window.console) {
                        window.console.error('Cannot process: ' + match);
                    }
                }

            }
        }
        return matches;
    },

    createAutoStyle: function(textNodes, style, clazz) {
        var colored = this.document.createElement('span');
        MediumEditor.util.moveTextRangeIntoElement(textNodes[0], textNodes[textNodes.length - 1], colored);
        if (style !== undefined) {
            colored.setAttribute('style', style);
        }
        if (clazz !== undefined) {
            colored.setAttribute('class', clazz);
        }
        colored.setAttribute('data-auto-style', 'true');
    }
});

try {
    window.AutoStyleExtension = AutoStyleExtension;
} catch (e) {
    // whatever
}

try {
    module.exports = AutoStyleExtension;
} catch (e) {
    // whatever
}
