function nodeIsNotInsideAnchorTag(node) {
    return !MediumEditor.util.getClosestTag(node, 'a');
}

var AutoStyleExtension = MediumEditor.Extension.extend({
    config: [{
        matchcase: false,
        wordsonly: false,
        styles: [{
            style: 'background-color:yellow;',
            words: ['yellow']
        }, {
            style: 'background-color:gray;',
            words: ['gray', 'grey']
        }]
    }, {
        matchcase: true,
        wordsonly: true,
        styles: [{
            style: 'color:red;',
            words: ['RED']
        }, {
            style: 'background-color:orange;',
            words: ['oraNGE']
        }]
    }],
    regexColors: [],
    init: function() {
        MediumEditor.Extension.prototype.init.apply(this, arguments);
        this.disableEventHandling = false;

        for (var i = 0; i < this.config.length; i++) {

            var conf = this.config[i];
            var matchcase = conf.matchcase === true ? 'g' : 'gi';
            var wordsonly = conf.wordsonly === true ? '\\b' : '';

            for (var s = 0; s < conf.styles.length; s++) {
                var style = conf.styles[s].style;
                var words = wordsonly + conf.styles[s].words.join('|') + wordsonly;
                var regex = new RegExp(words, matchcase);
                this.regexColors.push({
                    style: style,
                    regex: regex
                });
            }
        }

        this.subscribe('editableKeypress', this.onKeypress.bind(this));
        this.subscribe('editableBlur', this.onBlur.bind(this));
    },

    onBlur: function(blurEvent, editable) {
        this.performLinking(editable);
    },

    onKeypress: function(keyPressEvent) {
        if (this.disableEventHandling) {
            return;
        }

        if (MediumEditor.util.isKey(keyPressEvent, [MediumEditor.util.keyCode.SPACE, MediumEditor.util.keyCode.ENTER])) {
            clearTimeout(this.performLinkingTimeout);
            // Saving/restoring the selection in the middle of a keypress doesn't work well...
            this.performLinkingTimeout = setTimeout(function() {
                try {
                    var sel = this.base.exportSelection();
                    if (this.performLinking(keyPressEvent.target)) {
                        // pass true for favorLaterSelectionAnchor - this is needed for links at the end of a
                        // paragraph in MS IE, or MS IE causes the link to be deleted right after adding it.
                        this.base.importSelection(sel, true);
                    }
                } catch (e) {
                    if (window.console) {
                        window.console.error('Failed to perform Styleing', e);
                    }
                    this.disableEventHandling = true;
                }
            }.bind(this), 0);
        }
    },

    performLinking: function(contenteditable) {
        /*
        Perform linking on blockElement basis, blockElements are HTML elements with text content and without
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
            documentModified = this.removeObsoleteAutoStyleSpans(blockElements[i]) || documentModified;
            documentModified = this.performStyleingWithinElement(blockElements[i]) || documentModified;
        }
        this.base.events.updateInput(contenteditable, {
            target: contenteditable,
            currentTarget: contenteditable
        });
        return documentModified;
    },

    removeObsoleteAutoStyleSpans: function(element) {
        if (!element || element.nodeType === 3) {
            return false;
        }

        var spans = element.querySelectorAll('span[data-auto-style="true"]'),
            documentModified = false;

        for (var i = 0; i < spans.length; i++) {
            var textContent = spans[i].textContent;
            if (textContent.indexOf('://') === -1) {
                textContent = MediumEditor.util.ensureUrlHasProtocol(textContent);
            }
            if (spans[i].getAttribute('data-href') !== textContent && nodeIsNotInsideAnchorTag(spans[i])) {
                documentModified = true;
                var trimmedTextContent = textContent.replace(/\s+$/, '');
                if (spans[i].getAttribute('data-href') === trimmedTextContent) {
                    var charactersTrimmed = textContent.length - trimmedTextContent.length,
                        subtree = MediumEditor.util.splitOffDOMTree(spans[i], this.splitTextBeforeEnd(spans[i], charactersTrimmed));
                    spans[i].parentNode.insertBefore(subtree, spans[i].nextSibling);
                } else {
                    // Some editing has happened to the span, so just remove it entirely. The user can put it back
                    // around just the href content if they need to prevent it from linking
                    MediumEditor.util.unwrap(spans[i], this.document);
                }
            }
        }
        return documentModified;
    },

    splitTextBeforeEnd: function(element, characterCount) {
        var treeWalker = this.document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false),
            lastChildNotExhausted = true;

        // Start the tree walker at the last descendant of the span
        while (lastChildNotExhausted) {
            lastChildNotExhausted = treeWalker.lastChild() !== null;
        }

        var currentNode,
            currentNodeValue,
            previousNode;
        while (characterCount > 0 && previousNode !== null) {
            currentNode = treeWalker.currentNode;
            currentNodeValue = currentNode.nodeValue;
            if (currentNodeValue.length > characterCount) {
                previousNode = currentNode.splitText(currentNodeValue.length - characterCount);
                characterCount = 0;
            } else {
                previousNode = treeWalker.previousNode();
                characterCount -= currentNodeValue.length;
            }
        }
        return previousNode;
    },

    performStyleingWithinElement: function(element) {
        var matches = this.findStyleableText(element),
            linkCreated = false;

        for (var matchIndex = 0; matchIndex < matches.length; matchIndex++) {
            var matchingTextNodes = MediumEditor.util.findOrCreateMatchingTextNodes(this.document, element,
                matches[matchIndex]);
            if (this.shouldNotStyle(matchingTextNodes)) {
                continue;
            }
            this.createAutoStyle(matchingTextNodes, matches[matchIndex].style);
        }
        return linkCreated;
    },

    shouldNotStyle: function(textNodes) {
        var shouldNotStyle = false;
        for (var i = 0; i < textNodes.length && shouldNotStyle === false; i++) {
            // Do not link if the text node is either inside an anchor or inside span[data-auto-style]
            shouldNotStyle = !!MediumEditor.util.traverseUp(textNodes[i], function(node) {
                return node.nodeName.toLowerCase() === 'a' ||
                    (node.getAttribute && node.getAttribute('data-auto-style') === 'true');
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
            var linkRegExp = rc.regex;

            while ((match = linkRegExp.exec(textContent)) !== null) {
                var matchOk = true,
                    matchEnd = match.index + match[0].length;

                if (matchOk) {
                    matches.push({
                        style: style,
                        start: match.index,
                        end: matchEnd
                    });
                }
            }

        }
        return matches;
    },

    createAutoStyle: function(textNodes, style) {
        var colored = this.document.createElement('span'),
            span = this.document.createElement('span');
        MediumEditor.util.moveTextRangeIntoElement(textNodes[0], textNodes[textNodes.length - 1], colored);
        colored.setAttribute('style', style);
        colored.insertBefore(span, colored.firstChild);
        span.setAttribute('data-auto-style', 'true');
        while (colored.childNodes.length > 1) {
            span.appendChild(colored.childNodes[1]);
        }
    }
});
