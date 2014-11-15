var request = require("request");
var cheerio = require("cheerio");
var sax = require("sax");

var getdoc = function(url, callback) {
  request({url:"http://flex.sourceforge.net/manual/" + url}, function(err, res, body) {
    callback(body);
  });
};

var gettitle = function(title) {
  var re = /^[0-9]+(\.[0-9]+)?\s+/;
  var m = re.exec(title);
  if (m) {
    title = title.substr(m[0].length);
  }
  return title;
};

var escapelatex = function(text) {
  var esc = [
    {re: /([#$%^&_{}~\\])/gm, tex: "\\$1{}"},
    {re: /\\\\/gm, tex: "$\\backslash$"}
  ];
  esc.forEach(function(item) {
    text = text.replace(item.re, item.tex);
  });
  return text;
};

var getchapter = function(hrefs) {
  if (hrefs.length <= 0) return;
  var href = hrefs.pop();
  getdoc(href, function(html) {
    var tex = "";
    var tag = [];
    var parser = sax.parser(false, {
      trim: true,
      lowercase: true
    });
    parser.onerror = function(err) {
    };
    parser.onopentag = function(node) {
      name = node.name;
      if ((node.name === "pre" || node.name === "span") && node.attributes.class) {
        name += "." + node.attributes.class;
      }
      tag.push(name);
      if (name === "h2") {
        tex = "\\chapter{";
      } else if (name === "h3") {
        tex = "\\section{";
      } else if (name === "p") {
        tex += "\n\n";
      } else if (name === "ol") {
        tex += "\n\\begin{enumerate}";
      } else if (name === "ul") {
        tex += "\n\\begin{itemize}";
      } else if (name === "li") {
        tex += "\n\\item ";
      } else if (name === "code") {
        tex += " \\verb`";
      } else if (name === "span.samp") {
        tex += "\\verb`";
      } else if (name === "pre.verbatim") {
        tex += "\n\\begin{verbatim}\n";
      }
    };
    parser.onclosetag = function(name) {
      name = tag.pop();
      if (name === "h2") {
        tex += "}\n";
      } else if (name === "h3") {
        tex += "}\n";
      } else if (name === "ol") {
        tex += "\n\\end{enumerate}\n";
      } else if (name === "ul") {
        tex += "\n\\end{itemize}\n";
      } else if (name === "code") {
        tex += "` ";
      } else if (name === "span.samp") {
        tex += "`";
      } else if (name === "pre.verbatim") {
        tex += "\n\\end{verbatim}\n";
      }
     };
    parser.ontext = function(text) {
      name = tag[tag.length - 1];
      if (name === "h2") {
        tex += gettitle(text);
      } else if (name === "h3") {
        tex += gettitle(text);
      } else if (name === "p" || name === "a" || name === "li" || name === "dd") {
        tex += escapelatex(text);
      } else if (name === "code" || name === "span.samp" || name === "pre.verbatim") {
        tex += text;
      }
    };
    parser.onend = function() {
      console.log(tex);
      getchapter(hrefs);
    };
    parser.write(html).close();
  });
};

getdoc("", function(html) {
  var hrefs = [];
  var $ = cheerio.load(html);
  $(".contents li a").each(function(idx, item) {
    var href = $(this).attr("href");
    hrefs.push(href);
  });
  hrefs = hrefs.reverse();
  getchapter(hrefs);
});