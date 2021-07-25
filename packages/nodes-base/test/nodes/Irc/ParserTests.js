// created from https://raw.githubusercontent.com/ircdocs/parser-tests/master/tests/msg-join.yaml
// used under CC0 Public Domain
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

// created from https://raw.githubusercontent.com/ircdocs/parser-tests/master/tests/msg-split.yaml
// used under CC0 Public Domain
exports.SplitTests = {
  "tests": [
    {
      "input": "foo bar baz asdf",
      "atoms": {
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          "asdf"
        ]
      }
    },
    {
      "input": ":coolguy foo bar baz asdf",
      "atoms": {
        "source": "coolguy",
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          "asdf"
        ]
      }
    },
    {
      "input": "foo bar baz :asdf quux",
      "atoms": {
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          "asdf quux"
        ]
      }
    },
    {
      "input": "foo bar baz :",
      "atoms": {
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          ""
        ]
      }
    },
    {
      "input": "foo bar baz ::asdf",
      "atoms": {
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          ":asdf"
        ]
      }
    },
    {
      "input": ":coolguy foo bar baz :asdf quux",
      "atoms": {
        "source": "coolguy",
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          "asdf quux"
        ]
      }
    },
    {
      "input": ":coolguy foo bar baz :  asdf quux ",
      "atoms": {
        "source": "coolguy",
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          "  asdf quux "
        ]
      }
    },
    {
      "input": ":coolguy PRIVMSG bar :lol :) ",
      "atoms": {
        "source": "coolguy",
        "verb": "PRIVMSG",
        "params": [
          "bar",
          "lol :) "
        ]
      }
    },
    {
      "input": ":coolguy foo bar baz :",
      "atoms": {
        "source": "coolguy",
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          ""
        ]
      }
    },
    {
      "input": ":coolguy foo bar baz :  ",
      "atoms": {
        "source": "coolguy",
        "verb": "foo",
        "params": [
          "bar",
          "baz",
          "  "
        ]
      }
    },
    {
      "input": "@a=b;c=32;k;rt=ql7 foo",
      "atoms": {
        "verb": "foo",
        "tags": {
          "a": "b",
          "c": "32",
          "k": "",
          "rt": "ql7"
        }
      }
    },
    {
      "input": "@a=b\\\\and\\nk;c=72\\s45;d=gh\\:764 foo",
      "atoms": {
        "verb": "foo",
        "tags": {
          "a": "b\\and\nk",
          "c": "72 45",
          "d": "gh;764"
        }
      }
    },
    {
      "input": "@c;h=;a=b :quux ab cd",
      "atoms": {
        "tags": {
          "c": "",
          "h": "",
          "a": "b"
        },
        "source": "quux",
        "verb": "ab",
        "params": [
          "cd"
        ]
      }
    },
    {
      "input": ":src JOIN #chan",
      "atoms": {
        "source": "src",
        "verb": "JOIN",
        "params": [
          "#chan"
        ]
      }
    },
    {
      "input": ":src JOIN :#chan",
      "atoms": {
        "source": "src",
        "verb": "JOIN",
        "params": [
          "#chan"
        ]
      }
    },
    {
      "input": ":src AWAY",
      "atoms": {
        "source": "src",
        "verb": "AWAY"
      }
    },
    {
      "input": ":src AWAY ",
      "atoms": {
        "source": "src",
        "verb": "AWAY"
      }
    },
    {
      "input": ":cool\tguy foo bar baz",
      "atoms": {
        "source": "cool\tguy",
        "verb": "foo",
        "params": [
          "bar",
          "baz"
        ]
      }
    },
    {
      "input": ":coolguy!ag@net\u00035w\u0003ork.admin PRIVMSG foo :bar baz",
      "atoms": {
        "source": "coolguy!ag@net\u00035w\u0003ork.admin",
        "verb": "PRIVMSG",
        "params": [
          "foo",
          "bar baz"
        ]
      }
    },
    {
      "input": ":coolguy!~ag@n\u0002et\u000305w\u000fork.admin PRIVMSG foo :bar baz",
      "atoms": {
        "source": "coolguy!~ag@n\u0002et\u000305w\u000fork.admin",
        "verb": "PRIVMSG",
        "params": [
          "foo",
          "bar baz"
        ]
      }
    },
    {
      "input": "@tag1=value1;tag2;vendor1/tag3=value2;vendor2/tag4= :irc.example.com COMMAND param1 param2 :param3 param3",
      "atoms": {
        "tags": {
          "tag1": "value1",
          "tag2": "",
          "vendor1/tag3": "value2",
          "vendor2/tag4": ""
        },
        "source": "irc.example.com",
        "verb": "COMMAND",
        "params": [
          "param1",
          "param2",
          "param3 param3"
        ]
      }
    },
    {
      "input": ":irc.example.com COMMAND param1 param2 :param3 param3",
      "atoms": {
        "source": "irc.example.com",
        "verb": "COMMAND",
        "params": [
          "param1",
          "param2",
          "param3 param3"
        ]
      }
    },
    {
      "input": "@tag1=value1;tag2;vendor1/tag3=value2;vendor2/tag4 COMMAND param1 param2 :param3 param3",
      "atoms": {
        "tags": {
          "tag1": "value1",
          "tag2": "",
          "vendor1/tag3": "value2",
          "vendor2/tag4": ""
        },
        "verb": "COMMAND",
        "params": [
          "param1",
          "param2",
          "param3 param3"
        ]
      }
    },
    {
      "input": "COMMAND",
      "atoms": {
        "verb": "COMMAND"
      }
    },
    {
      "input": "@foo=\\\\\\\\\\:\\\\s\\s\\r\\n COMMAND",
      "atoms": {
        "tags": {
          "foo": "\\\\;\\s \r\n"
        },
        "verb": "COMMAND"
      }
    },
    {
      "input": ":gravel.mozilla.org 432  #momo :Erroneous Nickname: Illegal characters",
      "atoms": {
        "source": "gravel.mozilla.org",
        "verb": "432",
        "params": [
          "#momo",
          "Erroneous Nickname: Illegal characters"
        ]
      }
    },
    {
      "input": ":gravel.mozilla.org MODE #tckk +n ",
      "atoms": {
        "source": "gravel.mozilla.org",
        "verb": "MODE",
        "params": [
          "#tckk",
          "+n"
        ]
      }
    },
    {
      "input": ":services.esper.net MODE #foo-bar +o foobar  ",
      "atoms": {
        "source": "services.esper.net",
        "verb": "MODE",
        "params": [
          "#foo-bar",
          "+o",
          "foobar"
        ]
      }
    },
    {
      "input": "@tag1=value\\\\ntest COMMAND",
      "atoms": {
        "tags": {
          "tag1": "value\\ntest"
        },
        "verb": "COMMAND"
      }
    },
    {
      "input": "@tag1=value\\1 COMMAND",
      "atoms": {
        "tags": {
          "tag1": "value1"
        },
        "verb": "COMMAND"
      }
    },
    {
      "input": "@tag1=value1\\ COMMAND",
      "atoms": {
        "tags": {
          "tag1": "value1"
        },
        "verb": "COMMAND"
      }
    },
    {
      "input": "@tag1=1;tag2=3;tag3=4;tag1=5 COMMAND",
      "atoms": {
        "tags": {
          "tag1": "5",
          "tag2": "3",
          "tag3": "4"
        },
        "verb": "COMMAND"
      }
    },
    {
      "input": "@tag1=1;tag2=3;tag3=4;tag1=5;vendor/tag2=8 COMMAND",
      "atoms": {
        "tags": {
          "tag1": "5",
          "tag2": "3",
          "tag3": "4",
          "vendor/tag2": "8"
        },
        "verb": "COMMAND"
      }
    },
    {
      "input": ":SomeOp MODE #channel :+i",
      "atoms": {
        "source": "SomeOp",
        "verb": "MODE",
        "params": [
          "#channel",
          "+i"
        ]
      }
    },
    {
      "input": ":SomeOp MODE #channel +oo SomeUser :AnotherUser",
      "atoms": {
        "source": "SomeOp",
        "verb": "MODE",
        "params": [
          "#channel",
          "+oo",
          "SomeUser",
          "AnotherUser"
        ]
      }
    }
  ]
}