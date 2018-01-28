// @flow
import * as React from 'react'
import { STYLES_KEY } from 'emotion-utils'
import type { ElementType } from 'react'
import typeof ReactType from 'react'
import {
  testOmitPropsOnComponent,
  testAlwaysTrue,
  testOmitPropsOnStringTag,
  omitAssign,
  setTheme,
  type Interpolations,
  type StyledOptions,
  type CreateStyled
} from './utils'
import { getRegisteredStyles, scoped } from '../utils'
import { serializeStyles } from '../serialize'
import { CSSContext } from '../context'

let createStyled: CreateStyled = (tag: any, options?: StyledOptions) => {
  if (process.env.NODE_ENV !== 'production') {
    if (tag === undefined) {
      throw new Error(
        'You are trying to create a styled element with an undefined component.\nYou may have forgotten to import it.'
      )
    }
  }
  let identifierName
  if (options !== undefined) {
    identifierName = options.label
  }
  const isReal = tag.__emotion_real === tag
  const baseTag = (isReal && tag.__emotion_base) || tag

  const omitFn =
    typeof baseTag === 'string' &&
    baseTag.charAt(0) === baseTag.charAt(0).toLowerCase()
      ? testOmitPropsOnStringTag
      : testOmitPropsOnComponent

  return function() {
    let args = arguments
    let styles =
      isReal && tag[STYLES_KEY] !== undefined ? tag[STYLES_KEY].slice(0) : []
    if (identifierName !== undefined) {
      styles.push(`label:${identifierName};`)
    }
    if (args[0] == null || args[0].raw === undefined) {
      styles.push.apply(styles, args)
    } else {
      styles.push(args[0][0])
      let len = args.length
      let i = 1
      for (; i < len; i++) {
        styles.push(args[i], args[0][i])
      }
    }

    class Styled extends React.Component<*> {
      mergedProps: Object
      static toString: () => string
      static __emotion_real: any
      static __emotion_styles: Interpolations
      static __emotion_base: Styled
      static withComponent: (ElementType, options?: StyledOptions) => any

      render() {
        return (
          <CSSContext.Consumer>
            {context => {
              let className = ''
              let classInterpolations = []
              this.mergedProps = omitAssign(testAlwaysTrue, {}, this.props, {
                theme: context.theme || this.props.theme || {}
              })
              if (this.props.className) {
                className += getRegisteredStyles(
                  context.registered,
                  classInterpolations,
                  this.props.className
                )
              }

              className += scoped(
                context,
                serializeStyles.call(
                  this,
                  context.registered,
                  styles.concat(classInterpolations)
                )
              )

              return React.createElement(
                baseTag,
                omitAssign(omitFn, {}, this.props, {
                  className,
                  ref: this.props.innerRef
                })
              )
            }}
          </CSSContext.Consumer>
        )
      }
    }
    Styled.displayName =
      identifierName !== undefined
        ? identifierName
        : `Styled(${
            typeof baseTag === 'string'
              ? baseTag
              : baseTag.displayName || baseTag.name || 'Component'
          })`

    Styled[STYLES_KEY] = styles
    Styled.__emotion_base = baseTag
    Styled.__emotion_real = Styled

    Styled.withComponent = (
      nextTag: ElementType,
      nextOptions?: StyledOptions
    ) => {
      return createStyled(
        nextTag,
        nextOptions !== undefined
          ? // $FlowFixMe
            omitAssign(testAlwaysTrue, {}, options, nextOptions)
          : options
      )(...args)
    }

    return Styled
  }
}
if (process.env.NODE_ENV !== 'production' && typeof Proxy !== 'undefined') {
  createStyled = new Proxy(createStyled, {
    get(target, property) {
      switch (property) {
        // react-hot-loader tries to access this stuff
        case '__proto__':
        case 'name':
        case 'prototype':
        case 'displayName': {
          return target[property]
        }
        default: {
          throw new Error(
            `You're trying to use the styled shorthand without babel-plugin-emotion.` +
              `\nPlease install and setup babel-plugin-emotion or use the function call syntax(\`styled('${property}')\` instead of \`styled.${property}\`)`
          )
        }
      }
    }
  })
}

export default createStyled