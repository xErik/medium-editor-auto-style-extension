# AutoStyleExtension for Medium Editor

**AutoStyleExtension** for [Medium Editor](https://yabwe.github.io/medium-editor/) allows auto-styling of words. The auto-styling is defined by a configuration object, which gets passed to the constructur.

In detail:

1. <u>Words</u> and the <u>CSS style</u> to be applied to these words,
2. whether <u>case matching</u> is to be performed,
3. whether <u>words only</u> are matched, or substrings, too.
</ol>

Try out the [live example](https://xerik.github.io/medium-editor-auto-style-extension/).

### Installation

`npm install medium-editor-auto-style-extension`

### Usage

```javascript

<script type="text/javascript" src="<path>/medium-editor.js"></script>
<script type="text/javascript" src="<path>/auto-style.js"></script>

<div class="editable"></div>

var editor = new MediumEditor('.editable', {
    extensions: {
        'auto-highlight': new AutoStyleExtension(
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
            }]
        )
    }
});
```

## Contributers

This implementation based on the inbuild AutoLink plugin of Medium Editor.


## License

[MIT](https://opensource.org/licenses/MIT)
