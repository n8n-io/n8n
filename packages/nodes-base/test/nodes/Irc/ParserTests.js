// created from https://raw.githubusercontent.com/ircdocs/parser-tests/master/tests/msg-join.yaml
exports.JoinTests = {
  "tests": [
    {
      "desc": "Simple test with verb and params.",
      "atoms": {
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          "asdf"
        ]
      },
      "matches": [
        "foo bar baz asdf",
        "foo bar baz :asdf"
      ]
    },
    {
      "desc": "Simple test with source and no params.",
      "atoms": {
        "source": "src",
        "verb": "AWAY"
      },
      "matches": [
        ":src AWAY"
      ]
    },
    {
      "desc": "Simple test with source and empty trailing param.",
      "atoms": {
        "source": "src",
        "verb": "AWAY",
        "params": [
          ""
        ]
      },
      "matches": [
        ":src AWAY :"
      ]
    },
    {
      "desc": "Simple test with source.",
      "atoms": {
        "source": "coolguy",
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          "asdf"
        ]
      },
      "matches": [
        ":coolguy foo bar baz asdf",
        ":coolguy foo bar baz :asdf"
      ]
    },
    {
      "desc": "Simple test with trailing param.",
      "atoms": {
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          "asdf quux"
        ]
      },
      "matches": [
        "foo bar baz :asdf quux"
      ]
    },
    {
      "desc": "Simple test with empty trailing param.",
      "atoms": {
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          ""
        ]
      },
      "matches": [
        "foo bar baz :"
      ]
    },
    {
      "desc": "Simple test with trailing param containing colon.",
      "atoms": {
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          ":asdf"
        ]
      },
      "matches": [
        "foo bar baz ::asdf"
      ]
    },
    {
      "desc": "Test with source and trailing param.",
      "atoms": {
        "source": "coolguy",
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          "asdf quux"
        ]
      },
      "matches": [
        ":coolguy foo bar baz :asdf quux"
      ]
    },
    {
      "desc": "Test with trailing containing beginning+end whitespace.",
      "atoms": {
        "source": "coolguy",
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          "  asdf quux "
        ]
      },
      "matches": [
        ":coolguy foo bar baz :  asdf quux "
      ]
    },
    {
      "desc": "Test with trailing containing what looks like another trailing param.",
      "atoms": {
        "source": "coolguy",
        "verb": "PRIVMSG",
        "params": [
          "bar",
          "lol :) "
        ]
      },
      "matches": [
        ":coolguy PRIVMSG bar :lol :) "
      ]
    },
    {
      "desc": "Simple test with source and empty trailing.",
      "atoms": {
        "source": "coolguy",
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          ""
        ]
      },
      "matches": [
        ":coolguy foo bar baz :"
      ]
    },
    {
      "desc": "Trailing contains only spaces.",
      "atoms": {
        "source": "coolguy",
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          "  "
        ]
      },
      "matches": [
        ":coolguy foo bar baz :  "
      ]
    },
    {
      "desc": "Param containing tab (tab is not considered SPACE for message splitting).",
      "atoms": {
        "source": "coolguy",
        "verb": "foo",
        "params": [
          "b\tar",
          "baz"
        ]
      },
      "matches": [
        ":coolguy foo b\tar baz",
        ":coolguy foo b\tar :baz"
      ]
    },
    {
      "desc": "Tag with no value and space-filled trailing.",
      "atoms": {
        "tags": {
          "asd": ""
        },
        "source": "coolguy",
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          "  "
        ]
      },
      "matches": [
        "@asd :coolguy foo bar baz :  "
      ]
    },
    {
      "desc": "Tags with escaped values.",
      "atoms": {
        "verb": "foo",
        "tags": {
          "a": "b\\and\nk",
          "d": "gh;764"
        }
      },
      "matches": [
        "@a=b\\\\and\\nk;d=gh\\:764 foo",
        "@d=gh\\:764;a=b\\\\and\\nk foo"
      ]
    },
    {
      "desc": "Tags with escaped values and params.",
      "atoms": {
        "verb": "foo",
        "tags": {
          "a": "b\\and\nk",
          "d": "gh;764"
        },
        "params": [
          "par1",
          "par2"
        ]
      },
      "matches": [
        "@a=b\\\\and\\nk;d=gh\\:764 foo par1 par2",
        "@a=b\\\\and\\nk;d=gh\\:764 foo par1 :par2",
        "@d=gh\\:764;a=b\\\\and\\nk foo par1 par2",
        "@d=gh\\:764;a=b\\\\and\\nk foo par1 :par2"
      ]
    },
    {
      "desc": "Tag with long, strange values (including LF and newline).",
      "atoms": {
        "tags": {
          "foo": "\\\\;\\s \r\n"
        },
        "verb": "COMMAND"
      },
      "matches": [
        "@foo=\\\\\\\\\\:\\\\s\\s\\r\\n COMMAND"
      ]
    }
  ]
}