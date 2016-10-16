# AutoStyleExtension for Medium Editor

<p style="color:red;">Version 1.0.0 is not backwards compatible.</p>

**AutoStyleExtension** for [Medium Editor](https://yabwe.github.io/medium-editor/) allows auto-styling of words. The auto-styling is defined by a configuration object, which gets passed to the constructur.

In detail:

1. Words and the CSS style to be applied to these words.
2. Words and the CSS class to be applied to these words.
3. Whether case matching is to be performed.
4. Whether words only are matched, or substrings, too.

Try out the [live example](https://xerik.github.io/medium-editor-auto-style-extension/).

### Installation

```console
npm install medium-editor
npm install medium-editor-auto-style-extension
```

### Usage (via NPM)

*index.js*
```javascript
MediumEditor = require('medium-editor');
AutoStyleExtension = require('medium-editor-auto-style-extension');
```

### Usage (via Header)

*index.html*
```html

<script type="text/javascript" src="<path>/medium-editor.js"></script>
<script type="text/javascript" src="<path>/auto-style.js"></script>

<style type="text/css">
    .my-class {
        border: 1px solid red;
        background-color: yellow;
    }
</style>

<div class="editable">yellöw, gräy, gray, grey, RED, oraNGE, 汉语/漢語</div>

<script type="text/javascript">
var editor = new MediumEditor('.editable', {
    extensions: {
        'auto-style': new AutoStyleExtension({

            config: {
                sectionA: {
                    matchcase: false,
                    wordsonly: false,
                    class: 'my-class',
                    style: 'color:red;',
                    words: ['yellöw']
                },
                sectionB: {
                    matchcase: true,
                    wordsonly: true,
                    style: 'color:green;background-color:red;font-weight:bold;',
                    words: ['RED']
                },
                sectionC: {
                    matchcase: false,
                    wordsonly: false,
                    style: 'background-color:#aaa;',
                    words: ['gräy', 'gray', 'grey']
                },
                sectionD: {
                    matchcase: true,
                    wordsonly: true,
                    style: 'background-color:orange;',
                    words: ['oraNGE', '汉语/漢語']
                }
            }

        })
    }
});
</script>
```

## Configuration at Runtime

Additional methods allow manipulation of sections during runtime


```javascript
getConfig: function() {
  ...
},
removeConfigSection: function(sectionName) {
  ...
},
setConfigSection: function(sectionName, sectionObject) {
  ...
}
```

### Configuration at Runtime: Example

Changing the configuration causes re-evaluation of the content implicitly.


```javascript
var extension = editor.getExtensionByName('auto-style');

extension.setConfigSection('your-section-name', {
    matchcase: false,
    wordsonly: true,
    //class: 'my-class',
    style: 'color:red;',
    words: ['some','red','words']
});
```
## Changelog

<strong>1.0.0</strong>

- Reworked configuration structure
- Added unicode support
- Added configuration modification during runtime


## Contributers

This implementation is based on the inbuild AutoLink plugin of Medium Editor.


## License

[MIT](https://opensource.org/licenses/MIT)
