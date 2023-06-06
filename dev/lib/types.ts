export const tokenTypes = {
  defList: 'defList' as const,
  defListTerm: 'defListTerm' as const,
  defListDescriptionMarker: 'defListDescriptionMarker' as const,
  defListDescriptionPrefix: 'defListDescriptionPrefix' as const,
  defListDescriptionPrefixWhitespace: 'defListDescriptionPrefixWhitespace' as const,
  defListDescription: 'defListDescription' as const,
};

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    defList: 'defList';
    defListTerm: 'defListTerm';
    defListDescriptionMarker: 'defListDescriptionMarker';
    defListDescriptionPrefix: 'defListDescriptionPrefix';
    defListDescriptionPrefixWhitespace: 'defListDescriptionPrefixWhitespace';
    defListDescription: 'defListDescription';
  }
}
