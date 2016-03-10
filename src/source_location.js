var _ = require("lodash");

exports.sortTightestToBroadestContainer = function(a, b) {
  return exports.contains(b, a) ? 1 : -1;
};

exports.normalizeLocation = function(located) {
  if('line' in located) {
    located.startLine = located.endLine = located.line;
    located.startCharacter = located.endCharacter = located.character || 0;
  }
};

exports.contains = function(member, container) {
  var startsBefore = container.startLine < member.startLine ||
    (container.startLine === member.startLine &&
     container.startCharacter <= member.startCharacter);

  var endsAfter = container.endLine > member.endLine ||
    (container.endLine === member.endLine &&
      container.endCharacter >= member.endCharacter);

  return startsBefore && endsAfter;
};
