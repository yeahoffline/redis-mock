var helpers = require("../lib/helpers")
var should = require("should")

describe("patternToRegex", function () {
  it("should make straightforward matches on simple strings", function () {
    testPattern("hello", ["hello"], ["words", "hello."])
    testPattern("hello.", ["hello."], ["hello..", "hellos"])
    testPattern("hello :)", ["hello :)"], ["hellos", "hello:("])
  })

  it("should work with ? patterns", function () {
    testPattern("h?llo", ["hello", "hallo", "h?llo"], ["words", "hello."])
    testPattern("h\\?llo", ["h?llo"], ["hello", "hallo"])
  })

  it("should work with * patterns", function () {
    testPattern("h*llo", ["hllo", "hello", "h???llo"], ["hall", "hello."])
    testPattern("h\\*llo", ["h*llo"], ["hello", "hallo"])
  })

  it("should work with [] patterns", function () {
    testPattern("h[ae]llo", ["hello", "hallo"], ["hullo", "h?llo"])
    testPattern("h\\[\\]llo", ["h[]llo"], ["hello"])
  })

  it("should work with [^] patterns", function () {
    testPattern("h[^ae]llo", ["hullo", "h?llo"], ["hallo", "hello"])
  })

  it("should work with weird [] patterns", function () {
    var pattern = "h[\\^\\?\\*.(){}\\\\\\[\\]]llo"
    var goodStrings = ["h^llo", "h?llo", "h*llo", "h.llo", "h(llo", "h)llo", "h{llo", "h}llo", "h\\llo", "h[llo", "h]llo"]
    var badStrings = ["hallo", "hello", "hullo"]
    testPattern(pattern, goodStrings, badStrings)
  })

  it("should work with weird [^] patterns", function () {
    var pattern = "h[^\\^\\?\\*.(){}\\\\\\[\\]]llo"
    var goodStrings = ["hallo", "hello", "hullo"]
    var badStrings = ["h^llo", "h?llo", "h*llo", "h.llo", "h(llo", "h)llo", "h{llo", "h}llo", "h\\llo", "h[llo", "h]llo"]
    testPattern(pattern, goodStrings, badStrings)
  })

})

function testPattern(pattern, passes, fails) {
  var regex = helpers.patternToRegex(pattern)
  withPattern(regex, passes, true)
  withPattern(regex, fails, false)
}

function withPattern(regex, strings, expected) {
  strings.forEach(function (x) {
    should.equal(regex.test(x), expected)
  })
}
