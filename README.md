# AutoStyleExtension for Medium Editor

<p style="color:red;">Version 2.0.0 is not backwards compatible.</p>

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
    .combine-class-one {
        border: 2px dotted green;
    }
    .combine-class-two {
        background-color:gold;
    }
</style>

<div class="editable">CömbineStyleAndClass, CombineStyles, CombineClasses, gräy gräyx, oraNGE oraNGEX, ÖÖÖ</div>

<script type="text/javascript">
var editor = new MediumEditor('.editable', {
    extensions: {
        'auto-highlight': new AutoStyleExtension({

            config: {
                sectionA: {
                    matchcase: false,
                    wordsonly: false,
                    class: 'combine-class-one',
                    style: 'color:red;',
                    words: ['CömbineStyleAndClass']
                },
                sectionB: {
                    matchcase: false,
                    wordsonly: false,
                    style: 'background-color:#aaa;',
                    words: ['gräy']
                },
                sectionC: {
                    matchcase: true,
                    wordsonly: true,
                    style: 'background-color:orange;',
                    words: ['oraNGE']
                },
                sectionD: {
                    matchcase: true,
                    wordsonly: true,
                    class: 'combine-class-one',
                    words: ['CombineClasses']
                },
                sectionE: {
                    matchcase: true,
                    wordsonly: true,
                    class: 'combine-class-two',
                    words: ['CombineClasses']
                },
                sectionF: {
                    matchcase: true,
                    wordsonly: true,
                    style: 'border: 2px dotted green;',
                    words: ['CombineStyles']
                },
                sectionG: {
                    matchcase: true,
                    wordsonly: true,
                    style: 'background-color:gold;',
                    words: ['CombineStyles']
                },
                sectionH: {
                    matchcase: false,
                    wordsonly: false,
                    style: 'background-color:silver;',
                    words: ['ÖÖÖ']
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

Changing the configuration does not cause re-evaluation of the content implicitly. Call the function `applyStyles()` manually to re-evaluate the style of the content.


```javascript
var extension = editor.getExtensionByName('auto-style');

extension.setConfigSection('your-section-name', {
    matchcase: false,
    wordsonly: true,
    //class: 'a-class',
    style: 'color:red;',
    words: ['some','red','words']
});

extension.applyStyles();
```

## Changelog

<strong>2.0.0</strong>

- Call `extension.applyStyles()` to apply configuration modification made during runtime
- Tried to fix some weired unicode behavious during word matching.

<strong>1.1.0</strong>

- Allows for CSS- and Class-combination of words present in more than one section.

<strong>1.0.0</strong>

- Reworked configuration structure
- Added unicode support
- Added configuration modification during runtime


## Contributers

This implementation is based on the inbuild AutoLink plugin of Medium Editor.


## License

[MIT](https://opensource.org/licenses/MIT)
