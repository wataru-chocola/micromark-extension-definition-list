import { types } from 'micromark-util-symbol/types';

export const tokenTypes = Object.assign(types, {
  defList: 'defList',
  defListTerm: 'defListTerm',
  defListDescriptionMarker: 'defListDescriptionMarker',
  defListDescriptionPrefix: 'defListDescriptionPrefix',
  defListDescriptionPrefixWhitespace: 'defListDescriptionPrefixWhitespace',
  defListDescription: 'defListDescription',
  defListDescriptionIndent: 'defListDescriptionIndent',
});
