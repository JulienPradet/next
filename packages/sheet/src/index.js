// @flow
/*

high performance StyleSheet for css-in-js systems

- uses multiple style tags behind the scenes for millions of rules
- uses `insertRule` for appending in production for *much* faster performance
- 'polyfills' on server side

// usage

import StyleSheet from 'glamor/lib/sheet'
let styleSheet = new StyleSheet()

styleSheet.inject()
- 'injects' the stylesheet into the page (or into memory if on server)

styleSheet.insert('#box { border: 1px solid red; }')
- appends a css rule into the stylesheet

styleSheet.flush()
- empties the stylesheet of all its contents

*/

// $FlowFixMe
function sheetForTag(tag: HTMLStyleElement): CSSStyleSheet {
  if (tag.sheet) {
    // $FlowFixMe
    return tag.sheet
  }

  // this weirdness brought to you by firefox
  /* istanbul ignore next */
  for (let i = 0; i < document.styleSheets.length; i++) {
    if (document.styleSheets[i].ownerNode === tag) {
      // $FlowFixMe
      return document.styleSheets[i]
    }
  }
}

export type Options = {
  nonce?: string,
  key?: string,
  container?: HTMLElement,
  speedy?: boolean,
  maxLength?: number
}

export class StyleSheet {
  isSpeedy: boolean
  ctr: number
  tags: HTMLStyleElement[]
  container: HTMLElement
  maxLength: number
  key: string | void
  nonce: string | void
  constructor(options: Options | void) {
    if (options === undefined) options = {}
    this.isSpeedy =
      options.speedy === undefined
        ? process.env.NODE_ENV === 'production'
        : options.speedy
    // maxLength is how many rules we have per style tag, it's 65000 in speedy mode
    // because that's the upper limit in IE 10 TODO: make sure that is actually correct
    // it's 1 in dev because we insert source maps that map a single rule to a location
    // and you can only have one source map per style tag
    this.maxLength = options.maxLength || this.isSpeedy ? 65000 : 1
    this.tags = []
    this.ctr = 0
    this.nonce = options.nonce
    // key is the value of the data-emotion attribute, it's used to identify different sheets
    this.key = options.key || ''
    // $FlowFixMe
    this.container =
      options.container ||
      (typeof document !== 'undefined' ? document.head : null)
  }
  insert(rule: string) {
    if (this.ctr % this.maxLength === 0) {
      let tag = document.createElement('style')
      tag.setAttribute('data-emotion', this.key)
      if (this.nonce !== undefined) {
        tag.setAttribute('nonce', this.nonce)
      }
      tag.appendChild(document.createTextNode(''))
      this.container.appendChild(tag)
      this.tags.push(tag)
    }
    const tag = this.tags[this.tags.length - 1]

    if (this.isSpeedy) {
      const sheet = sheetForTag(tag)
      try {
        // this is the ultrafast version, works across browsers
        // the big drawback is that the css won't be editable in devtools
        sheet.insertRule(rule, sheet.cssRules.length)
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `There was a problem inserting the following rule: "${rule}"`,
            e
          )
        }
      }
    } else {
      tag.appendChild(document.createTextNode(rule))
    }
    this.ctr++
  }
  flush() {
    // $FlowFixMe
    this.tags.forEach(tag => tag.parentNode.removeChild(tag))
    this.tags = []
    this.ctr = 0
  }
}
