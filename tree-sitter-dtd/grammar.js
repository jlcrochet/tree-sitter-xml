/**
 * @file Tree-sitter grammar definition for DTD
 * @author ObserverOfTime
 * @license MIT
 * @see {@link https://www.w3.org/TR/xml/|W3C standard}
 */

const c = require('../common');

const O = optional;

module.exports = grammar({
  name: 'dtd',

  extras: _ => [],

  supertypes: $ => [
    $._markupdecl,
    $._AttType,
    $._EnumeratedType,
    $._EntityDecl,
    $._Reference
  ],

  inline: $ => [
    $._occurences
  ],

  rules: {
    document: $ => c.rseq1(
      O($._S),
      $._markupdecl,
      $._DeclSep
    ),

    _markupdecl: $ => choice(
      $.elementdecl,
      $.AttlistDecl,
      $._EntityDecl,
      $.NotationDecl,
      $.PI,
      $.Comment
    ),

    _DeclSep: $ => choice($.PEReference, $._S),

    elementdecl: $ => seq(
      '<!ELEMENT',
      $._S,
      $.Name,
      $._S,
      $.contentspec,
      O($._S),
      '>'
    ),

    contentspec: $ => choice(
      'EMPTY',
      'ANY',
      $.Mixed,
      $.children
    ),

    Mixed: $ => choice(
      seq(
        '(',
        O($._S),
        '#PCDATA',
        c.rseq(
          O($._S),
          '|',
          O($._S),
          choice($.Name, $.PEReference),
          O($._S),
        ),
        ')',
        '*'
      ),
      seq(
        '(',
        O($._S),
        '#PCDATA',
        O($._S),
        ')'
      )
    ),

    // TODO: clean this up
    children: $ => seq(
      choice($._choice, $._seq),
      O($._occurences)
    ),

    _cp: $ => seq(
      choice($.Name, $._choice, $._seq),
      O($._occurences)
    ),

    _choice: $ => seq(
      '(',
      O($._S),
      $._cp,
      c.rseq1(
        O($._S),
        '|',
        O($._S),
        $._cp
      ),
      ')'
    ),

    _seq: $ => seq(
      '(',
      O($._S),
      $._cp,
      c.rseq(
        O($._S),
        ',',
        O($._S),
        $._cp
      ),
      ')'
    ),

    AttlistDecl: $ => seq(
      '<!ATTLIST',
      $._S,
      $.Name,
      repeat($._AttDef),
      O($._S),
      '>'
    ),

    _AttDef: $ => seq(
      $._S,
      $.Name,
      $._S,
      $._AttType,
      $._S,
      $.DefaultDecl
    ),

    _AttType: $ => choice(
      $.StringType,
      $.TokenizedType,
      $._EnumeratedType
    ),

    StringType: _ => 'CDATA',

    TokenizedType: _ => token(choice(
      'ID',
      'IDREF',
      'IDREFS',
      'ENTITY',
      'ENTITIES',
      'NMTOKEN',
      'NMTOKENS'
    )),

    _EnumeratedType: $ => choice(
      $.NotationType,
      $.Enumeration
    ),

    NotationType: $ => seq(
      'NOTATION',
      $._S,
      '(',
      O($._S),
      $.Name,
      c.rseq(
        O($._S),
        '|',
        O($._S)
      ),
      $.Name,
      O($._S),
      ')'
    ),

    Enumeration: $ => seq(
      '(',
      O($._S),
      $.Nmtoken,
      c.rseq(
        O($._S),
        '|',
        O($._S),
        $.Nmtoken
      ),
      O($._S),
      ')'
    ),

    DefaultDecl: $ => choice(
      '#REQUIRED',
      '#IMPLIED',
      seq(
        O(seq('#FIXED', $._S)),
        $.AttValue
      )
    ),

    _EntityDecl: $ => choice(
      $.GEDecl,
      $.PEDecl
    ),

    GEDecl: $ => seq(
      '<!ENTITY',
      $._S,
      $.Name,
      $._S,
      choice(
        $.EntityValue,
        seq(
          $.ExternalID,
          O($.NDataDecl)
        )
      ),
      O($._S),
      '>'
    ),

    PEDecl: $ => seq(
      '<!ENTITY',
      $._S,
      '%',
      $._S,
      $.Name,
      $._S,
      choice(
        $.EntityValue,
        $.ExternalID
      ),
      O($._S),
      '>'
    ),

    EntityValue: $ => choice(
      c.entity_value($, '"'),
      c.entity_value($, "'")
    ),

    NDataDecl: $ => seq($._S, 'NDATA', $._S, $.Name),

    NotationDecl: $ => seq(
      '<!NOTATION',
      $._S,
      $.Name,
      $._S,
      choice($.ExternalID, $.PublicID),
      O($._S),
      '>'
    ),

    PEReference: $ => seq('%', $.Name, ';'),

    _occurences: _ => choice('?', '*', '+'),

    _Char: _ => /[\u0001-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u,

    _S: _ => /[\x20\x09\x0D\x0A]+/,

    Name: _ => new RegExp(`${c.NAME_START_CHAR}${c.NAME_CHAR}*`, 'u'),

    Nmtoken: _ => new RegExp(`${c.NAME_CHAR}+`, 'u'),

    _Reference: $ => choice($.EntityRef, $.CharRef),

    EntityRef: $ => seq('&', $.Name, ';'),

    CharRef: _ => choice(
      seq('&#', /[0-9]+/, ';'),
      seq('&#x', /[0-9a-fA-F]+/, ';')
    ),

    AttValue: $ => choice(
      c.att_value($, '"'),
      c.att_value($, "'")
    ),

    ExternalID: $ => choice(
      seq('SYSTEM', $._S, $.SystemLiteral),
      seq('PUBLIC', $._S, $.PubidLiteral, $._S, $.SystemLiteral)
    ),

    PublicID: $ => prec.right(seq('PUBLIC', $._S, $.PubidLiteral)),

    SystemLiteral: _ => choice(
      seq('"', O(field('content', /[^"]*/)), '"'),
      seq("'", O(field('content', /[^']*/)), "'")
    ),

    PubidLiteral: _ => choice(
      seq('"', O(field('content', c.pubid_char("'"))), '"'),
      seq("'", O(field('content', c.pubid_char(''))), "'")
    ),

    // TODO: parse attributes
    PI: $ => seq(
      '<?',
      // FIXME: disallow /xml/i
      alias($.Name, $.PITarget),
      O(seq($._S, /([^?]|\?[^>])*/)),
      '?>'
    ),

    Comment: _ => token(seq(
      '<!--',
      /([^-]|-[^-])*/,
      '-->'
    )),

    _Misc: $ => choice(
      $.PI,
      $.Comment,
      $._S
    )
  }
});