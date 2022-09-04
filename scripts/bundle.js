// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

const SEMVER_SPEC_VERSION = "2.0.0";
const re = [];
const src = [];
let R = 0;
const NUMERICIDENTIFIER = R++;
src[NUMERICIDENTIFIER] = "0|[1-9]\\d*";
const NONNUMERICIDENTIFIER = R++;
src[NONNUMERICIDENTIFIER] = "\\d*[a-zA-Z-][a-zA-Z0-9-]*";
const MAINVERSION = R++;
const nid = src[NUMERICIDENTIFIER];
src[MAINVERSION] = `(${nid})\\.(${nid})\\.(${nid})`;
const PRERELEASEIDENTIFIER = R++;
src[PRERELEASEIDENTIFIER] = "(?:" + src[NUMERICIDENTIFIER] + "|" + src[NONNUMERICIDENTIFIER] + ")";
const PRERELEASE = R++;
src[PRERELEASE] = "(?:-(" + src[PRERELEASEIDENTIFIER] + "(?:\\." + src[PRERELEASEIDENTIFIER] + ")*))";
const BUILDIDENTIFIER = R++;
src[BUILDIDENTIFIER] = "[0-9A-Za-z-]+";
const BUILD = R++;
src[BUILD] = "(?:\\+(" + src[BUILDIDENTIFIER] + "(?:\\." + src[BUILDIDENTIFIER] + ")*))";
const FULL = R++;
const FULLPLAIN = "v?" + src[MAINVERSION] + src[PRERELEASE] + "?" + src[BUILD] + "?";
src[FULL] = "^" + FULLPLAIN + "$";
const GTLT = R++;
src[GTLT] = "((?:<|>)?=?)";
const XRANGEIDENTIFIER = R++;
src[XRANGEIDENTIFIER] = src[NUMERICIDENTIFIER] + "|x|X|\\*";
const XRANGEPLAIN = R++;
src[XRANGEPLAIN] = "[v=\\s]*(" + src[XRANGEIDENTIFIER] + ")" + "(?:\\.(" + src[XRANGEIDENTIFIER] + ")" + "(?:\\.(" + src[XRANGEIDENTIFIER] + ")" + "(?:" + src[PRERELEASE] + ")?" + src[BUILD] + "?" + ")?)?";
const XRANGE = R++;
src[XRANGE] = "^" + src[GTLT] + "\\s*" + src[XRANGEPLAIN] + "$";
const LONETILDE = R++;
src[LONETILDE] = "(?:~>?)";
const TILDE = R++;
src[TILDE] = "^" + src[LONETILDE] + src[XRANGEPLAIN] + "$";
const LONECARET = R++;
src[LONECARET] = "(?:\\^)";
const CARET = R++;
src[CARET] = "^" + src[LONECARET] + src[XRANGEPLAIN] + "$";
const COMPARATOR = R++;
src[COMPARATOR] = "^" + src[GTLT] + "\\s*(" + FULLPLAIN + ")$|^$";
const HYPHENRANGE = R++;
src[HYPHENRANGE] = "^\\s*(" + src[XRANGEPLAIN] + ")" + "\\s+-\\s+" + "(" + src[XRANGEPLAIN] + ")" + "\\s*$";
const STAR = R++;
src[STAR] = "(<|>)?=?\\s*\\*";
for(let i = 0; i < R; i++){
    if (!re[i]) {
        re[i] = new RegExp(src[i]);
    }
}
function parse(version, options) {
    if (typeof options !== "object") {
        options = {
            includePrerelease: false
        };
    }
    if (version instanceof SemVer) {
        return version;
    }
    if (typeof version !== "string") {
        return null;
    }
    if (version.length > 256) {
        return null;
    }
    const r = re[FULL];
    if (!r.test(version)) {
        return null;
    }
    try {
        return new SemVer(version, options);
    } catch  {
        return null;
    }
}
function valid(version, options) {
    if (version === null) return null;
    const v = parse(version, options);
    return v ? v.version : null;
}
class SemVer {
    raw;
    options;
    major;
    minor;
    patch;
    version;
    build;
    prerelease;
    constructor(version, options){
        if (typeof options !== "object") {
            options = {
                includePrerelease: false
            };
        }
        if (version instanceof SemVer) {
            version = version.version;
        } else if (typeof version !== "string") {
            throw new TypeError("Invalid Version: " + version);
        }
        if (version.length > 256) {
            throw new TypeError("version is longer than " + 256 + " characters");
        }
        if (!(this instanceof SemVer)) {
            return new SemVer(version, options);
        }
        this.options = options;
        const m = version.trim().match(re[FULL]);
        if (!m) {
            throw new TypeError("Invalid Version: " + version);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > Number.MAX_SAFE_INTEGER || this.major < 0) {
            throw new TypeError("Invalid major version");
        }
        if (this.minor > Number.MAX_SAFE_INTEGER || this.minor < 0) {
            throw new TypeError("Invalid minor version");
        }
        if (this.patch > Number.MAX_SAFE_INTEGER || this.patch < 0) {
            throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
            this.prerelease = [];
        } else {
            this.prerelease = m[4].split(".").map((id)=>{
                if (/^[0-9]+$/.test(id)) {
                    const num = +id;
                    if (num >= 0 && num < Number.MAX_SAFE_INTEGER) {
                        return num;
                    }
                }
                return id;
            });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
    }
    format() {
        this.version = this.major + "." + this.minor + "." + this.patch;
        if (this.prerelease.length) {
            this.version += "-" + this.prerelease.join(".");
        }
        return this.version;
    }
    compare(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }
        return this.compareMain(other) || this.comparePre(other);
    }
    compareMain(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }
        return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
    }
    comparePre(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
            return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
            return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
            return 0;
        }
        let i = 0;
        do {
            const a = this.prerelease[i];
            const b = other.prerelease[i];
            if (a === undefined && b === undefined) {
                return 0;
            } else if (b === undefined) {
                return 1;
            } else if (a === undefined) {
                return -1;
            } else if (a === b) {
                continue;
            } else {
                return compareIdentifiers(a, b);
            }
        }while (++i)
        return 1;
    }
    compareBuild(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }
        let i = 0;
        do {
            const a = this.build[i];
            const b = other.build[i];
            if (a === undefined && b === undefined) {
                return 0;
            } else if (b === undefined) {
                return 1;
            } else if (a === undefined) {
                return -1;
            } else if (a === b) {
                continue;
            } else {
                return compareIdentifiers(a, b);
            }
        }while (++i)
        return 1;
    }
    inc(release, identifier) {
        switch(release){
            case "premajor":
                this.prerelease.length = 0;
                this.patch = 0;
                this.minor = 0;
                this.major++;
                this.inc("pre", identifier);
                break;
            case "preminor":
                this.prerelease.length = 0;
                this.patch = 0;
                this.minor++;
                this.inc("pre", identifier);
                break;
            case "prepatch":
                this.prerelease.length = 0;
                this.inc("patch", identifier);
                this.inc("pre", identifier);
                break;
            case "prerelease":
                if (this.prerelease.length === 0) {
                    this.inc("patch", identifier);
                }
                this.inc("pre", identifier);
                break;
            case "major":
                if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
                    this.major++;
                }
                this.minor = 0;
                this.patch = 0;
                this.prerelease = [];
                break;
            case "minor":
                if (this.patch !== 0 || this.prerelease.length === 0) {
                    this.minor++;
                }
                this.patch = 0;
                this.prerelease = [];
                break;
            case "patch":
                if (this.prerelease.length === 0) {
                    this.patch++;
                }
                this.prerelease = [];
                break;
            case "pre":
                if (this.prerelease.length === 0) {
                    this.prerelease = [
                        0
                    ];
                } else {
                    let i = this.prerelease.length;
                    while(--i >= 0){
                        if (typeof this.prerelease[i] === "number") {
                            this.prerelease[i]++;
                            i = -2;
                        }
                    }
                    if (i === -1) {
                        this.prerelease.push(0);
                    }
                }
                if (identifier) {
                    if (this.prerelease[0] === identifier) {
                        if (isNaN(this.prerelease[1])) {
                            this.prerelease = [
                                identifier,
                                0
                            ];
                        }
                    } else {
                        this.prerelease = [
                            identifier,
                            0
                        ];
                    }
                }
                break;
            default:
                throw new Error("invalid increment argument: " + release);
        }
        this.format();
        this.raw = this.version;
        return this;
    }
    toString() {
        return this.version;
    }
}
function inc(version, release, options, identifier) {
    if (typeof options === "string") {
        identifier = options;
        options = undefined;
    }
    try {
        return new SemVer(version, options).inc(release, identifier).version;
    } catch  {
        return null;
    }
}
function diff(version1, version2, options) {
    if (eq(version1, version2, options)) {
        return null;
    } else {
        const v1 = parse(version1);
        const v2 = parse(version2);
        let prefix = "";
        let defaultResult = null;
        if (v1 && v2) {
            if (v1.prerelease.length || v2.prerelease.length) {
                prefix = "pre";
                defaultResult = "prerelease";
            }
            for(const key in v1){
                if (key === "major" || key === "minor" || key === "patch") {
                    if (v1[key] !== v2[key]) {
                        return prefix + key;
                    }
                }
            }
        }
        return defaultResult;
    }
}
const numeric = /^[0-9]+$/;
function compareIdentifiers(a, b) {
    const anum = numeric.test(a);
    const bnum = numeric.test(b);
    if (a === null || b === null) throw "Comparison against null invalid";
    if (anum && bnum) {
        a = +a;
        b = +b;
    }
    return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
}
function rcompareIdentifiers(a, b) {
    return compareIdentifiers(b, a);
}
function major(v, options) {
    return new SemVer(v, options).major;
}
function minor(v, options) {
    return new SemVer(v, options).minor;
}
function patch(v, options) {
    return new SemVer(v, options).patch;
}
function compare(v1, v2, options) {
    return new SemVer(v1, options).compare(new SemVer(v2, options));
}
function compareBuild(a, b, options) {
    const versionA = new SemVer(a, options);
    const versionB = new SemVer(b, options);
    return versionA.compare(versionB) || versionA.compareBuild(versionB);
}
function rcompare(v1, v2, options) {
    return compare(v2, v1, options);
}
function sort(list, options) {
    return list.sort((a, b)=>{
        return compareBuild(a, b, options);
    });
}
function rsort(list, options) {
    return list.sort((a, b)=>{
        return compareBuild(b, a, options);
    });
}
function gt(v1, v2, options) {
    return compare(v1, v2, options) > 0;
}
function lt(v1, v2, options) {
    return compare(v1, v2, options) < 0;
}
function eq(v1, v2, options) {
    return compare(v1, v2, options) === 0;
}
function neq(v1, v2, options) {
    return compare(v1, v2, options) !== 0;
}
function gte(v1, v2, options) {
    return compare(v1, v2, options) >= 0;
}
function lte(v1, v2, options) {
    return compare(v1, v2, options) <= 0;
}
function cmp(v1, operator, v2, options) {
    switch(operator){
        case "===":
            if (typeof v1 === "object") v1 = v1.version;
            if (typeof v2 === "object") v2 = v2.version;
            return v1 === v2;
        case "!==":
            if (typeof v1 === "object") v1 = v1.version;
            if (typeof v2 === "object") v2 = v2.version;
            return v1 !== v2;
        case "":
        case "=":
        case "==":
            return eq(v1, v2, options);
        case "!=":
            return neq(v1, v2, options);
        case ">":
            return gt(v1, v2, options);
        case ">=":
            return gte(v1, v2, options);
        case "<":
            return lt(v1, v2, options);
        case "<=":
            return lte(v1, v2, options);
        default:
            throw new TypeError("Invalid operator: " + operator);
    }
}
const ANY = {};
class Comparator {
    semver;
    operator;
    value;
    options;
    constructor(comp, options){
        if (typeof options !== "object") {
            options = {
                includePrerelease: false
            };
        }
        if (comp instanceof Comparator) {
            return comp;
        }
        if (!(this instanceof Comparator)) {
            return new Comparator(comp, options);
        }
        this.options = options;
        this.parse(comp);
        if (this.semver === ANY) {
            this.value = "";
        } else {
            this.value = this.operator + this.semver.version;
        }
    }
    parse(comp) {
        const r = re[COMPARATOR];
        const m = comp.match(r);
        if (!m) {
            throw new TypeError("Invalid comparator: " + comp);
        }
        const m1 = m[1];
        this.operator = m1 !== undefined ? m1 : "";
        if (this.operator === "=") {
            this.operator = "";
        }
        if (!m[2]) {
            this.semver = ANY;
        } else {
            this.semver = new SemVer(m[2], this.options);
        }
    }
    test(version) {
        if (this.semver === ANY || version === ANY) {
            return true;
        }
        if (typeof version === "string") {
            version = new SemVer(version, this.options);
        }
        return cmp(version, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
        if (!(comp instanceof Comparator)) {
            throw new TypeError("a Comparator is required");
        }
        if (typeof options !== "object") {
            options = {
                includePrerelease: false
            };
        }
        let rangeTmp;
        if (this.operator === "") {
            if (this.value === "") {
                return true;
            }
            rangeTmp = new Range(comp.value, options);
            return satisfies(this.value, rangeTmp, options);
        } else if (comp.operator === "") {
            if (comp.value === "") {
                return true;
            }
            rangeTmp = new Range(this.value, options);
            return satisfies(comp.semver, rangeTmp, options);
        }
        const sameDirectionIncreasing = (this.operator === ">=" || this.operator === ">") && (comp.operator === ">=" || comp.operator === ">");
        const sameDirectionDecreasing = (this.operator === "<=" || this.operator === "<") && (comp.operator === "<=" || comp.operator === "<");
        const sameSemVer = this.semver.version === comp.semver.version;
        const differentDirectionsInclusive = (this.operator === ">=" || this.operator === "<=") && (comp.operator === ">=" || comp.operator === "<=");
        const oppositeDirectionsLessThan = cmp(this.semver, "<", comp.semver, options) && (this.operator === ">=" || this.operator === ">") && (comp.operator === "<=" || comp.operator === "<");
        const oppositeDirectionsGreaterThan = cmp(this.semver, ">", comp.semver, options) && (this.operator === "<=" || this.operator === "<") && (comp.operator === ">=" || comp.operator === ">");
        return sameDirectionIncreasing || sameDirectionDecreasing || sameSemVer && differentDirectionsInclusive || oppositeDirectionsLessThan || oppositeDirectionsGreaterThan;
    }
    toString() {
        return this.value;
    }
}
class Range {
    range;
    raw;
    options;
    includePrerelease;
    set;
    constructor(range, options){
        if (typeof options !== "object") {
            options = {
                includePrerelease: false
            };
        }
        if (range instanceof Range) {
            if (range.includePrerelease === !!options.includePrerelease) {
                return range;
            } else {
                return new Range(range.raw, options);
            }
        }
        if (range instanceof Comparator) {
            return new Range(range.value, options);
        }
        if (!(this instanceof Range)) {
            return new Range(range, options);
        }
        this.options = options;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range;
        this.set = range.split(/\s*\|\|\s*/).map((range)=>this.parseRange(range.trim())).filter((c)=>{
            return c.length;
        });
        if (!this.set.length) {
            throw new TypeError("Invalid SemVer Range: " + range);
        }
        this.format();
    }
    format() {
        this.range = this.set.map((comps)=>comps.join(" ").trim()).join("||").trim();
        return this.range;
    }
    parseRange(range) {
        range = range.trim();
        const hr = re[HYPHENRANGE];
        range = range.replace(hr, hyphenReplace);
        range = range.split(/\s+/).join(" ");
        const set = range.split(" ").map((comp)=>parseComparator(comp, this.options)).join(" ").split(/\s+/);
        return set.map((comp)=>new Comparator(comp, this.options));
    }
    test(version) {
        if (typeof version === "string") {
            version = new SemVer(version, this.options);
        }
        for(let i = 0; i < this.set.length; i++){
            if (testSet(this.set[i], version, this.options)) {
                return true;
            }
        }
        return false;
    }
    intersects(range, options) {
        if (!(range instanceof Range)) {
            throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators)=>{
            return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators)=>{
                return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator)=>{
                    return rangeComparators.every((rangeComparator)=>{
                        return thisComparator.intersects(rangeComparator, options);
                    });
                });
            });
        });
    }
    toString() {
        return this.range;
    }
}
function testSet(set, version, options) {
    for(let i = 0; i < set.length; i++){
        if (!set[i].test(version)) {
            return false;
        }
    }
    if (version.prerelease.length && !options.includePrerelease) {
        for(let i1 = 0; i1 < set.length; i1++){
            if (set[i1].semver === ANY) {
                continue;
            }
            if (set[i1].semver.prerelease.length > 0) {
                const allowed = set[i1].semver;
                if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
                    return true;
                }
            }
        }
        return false;
    }
    return true;
}
function isSatisfiable(comparators, options) {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while(result && remainingComparators.length){
        result = remainingComparators.every((otherComparator)=>{
            return testComparator?.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
    }
    return result;
}
function toComparators(range, options) {
    return new Range(range, options).set.map((comp)=>{
        return comp.map((c)=>c.value).join(" ").trim().split(" ");
    });
}
function parseComparator(comp, options) {
    comp = replaceCarets(comp, options);
    comp = replaceTildes(comp, options);
    comp = replaceXRanges(comp, options);
    comp = replaceStars(comp, options);
    return comp;
}
function isX(id) {
    return !id || id.toLowerCase() === "x" || id === "*";
}
function replaceTildes(comp, options) {
    return comp.trim().split(/\s+/).map((comp)=>replaceTilde(comp, options)).join(" ");
}
function replaceTilde(comp, _options) {
    const r = re[TILDE];
    return comp.replace(r, (_, M, m, p, pr)=>{
        let ret;
        if (isX(M)) {
            ret = "";
        } else if (isX(m)) {
            ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
        } else if (isX(p)) {
            ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
        } else if (pr) {
            ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + (+m + 1) + ".0";
        } else {
            ret = ">=" + M + "." + m + "." + p + " <" + M + "." + (+m + 1) + ".0";
        }
        return ret;
    });
}
function replaceCarets(comp, options) {
    return comp.trim().split(/\s+/).map((comp)=>replaceCaret(comp, options)).join(" ");
}
function replaceCaret(comp, _options) {
    const r = re[CARET];
    return comp.replace(r, (_, M, m, p, pr)=>{
        let ret;
        if (isX(M)) {
            ret = "";
        } else if (isX(m)) {
            ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
        } else if (isX(p)) {
            if (M === "0") {
                ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
            } else {
                ret = ">=" + M + "." + m + ".0 <" + (+M + 1) + ".0.0";
            }
        } else if (pr) {
            if (M === "0") {
                if (m === "0") {
                    ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + m + "." + (+p + 1);
                } else {
                    ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + (+m + 1) + ".0";
                }
            } else {
                ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + (+M + 1) + ".0.0";
            }
        } else {
            if (M === "0") {
                if (m === "0") {
                    ret = ">=" + M + "." + m + "." + p + " <" + M + "." + m + "." + (+p + 1);
                } else {
                    ret = ">=" + M + "." + m + "." + p + " <" + M + "." + (+m + 1) + ".0";
                }
            } else {
                ret = ">=" + M + "." + m + "." + p + " <" + (+M + 1) + ".0.0";
            }
        }
        return ret;
    });
}
function replaceXRanges(comp, options) {
    return comp.split(/\s+/).map((comp)=>replaceXRange(comp, options)).join(" ");
}
function replaceXRange(comp, _options) {
    comp = comp.trim();
    const r = re[XRANGE];
    return comp.replace(r, (ret, gtlt, M, m, p, _pr)=>{
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
            gtlt = "";
        }
        if (xM) {
            if (gtlt === ">" || gtlt === "<") {
                ret = "<0.0.0";
            } else {
                ret = "*";
            }
        } else if (gtlt && anyX) {
            if (xm) {
                m = 0;
            }
            p = 0;
            if (gtlt === ">") {
                gtlt = ">=";
                if (xm) {
                    M = +M + 1;
                    m = 0;
                    p = 0;
                } else {
                    m = +m + 1;
                    p = 0;
                }
            } else if (gtlt === "<=") {
                gtlt = "<";
                if (xm) {
                    M = +M + 1;
                } else {
                    m = +m + 1;
                }
            }
            ret = gtlt + M + "." + m + "." + p;
        } else if (xm) {
            ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
        } else if (xp) {
            ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
        }
        return ret;
    });
}
function replaceStars(comp, _options) {
    return comp.trim().replace(re[STAR], "");
}
function hyphenReplace(_$0, from, fM, fm, fp, _fpr, _fb, to, tM, tm, tp, tpr, _tb) {
    if (isX(fM)) {
        from = "";
    } else if (isX(fm)) {
        from = ">=" + fM + ".0.0";
    } else if (isX(fp)) {
        from = ">=" + fM + "." + fm + ".0";
    } else {
        from = ">=" + from;
    }
    if (isX(tM)) {
        to = "";
    } else if (isX(tm)) {
        to = "<" + (+tM + 1) + ".0.0";
    } else if (isX(tp)) {
        to = "<" + tM + "." + (+tm + 1) + ".0";
    } else if (tpr) {
        to = "<=" + tM + "." + tm + "." + tp + "-" + tpr;
    } else {
        to = "<=" + to;
    }
    return (from + " " + to).trim();
}
function satisfies(version, range, options) {
    try {
        range = new Range(range, options);
    } catch  {
        return false;
    }
    return range.test(version);
}
function maxSatisfying(versions, range, options) {
    let max = null;
    let maxSV = null;
    let rangeObj;
    try {
        rangeObj = new Range(range, options);
    } catch  {
        return null;
    }
    versions.forEach((v)=>{
        if (rangeObj.test(v)) {
            if (!max || maxSV && maxSV.compare(v) === -1) {
                max = v;
                maxSV = new SemVer(max, options);
            }
        }
    });
    return max;
}
function minSatisfying(versions, range, options) {
    let min = null;
    let minSV = null;
    let rangeObj;
    try {
        rangeObj = new Range(range, options);
    } catch  {
        return null;
    }
    versions.forEach((v)=>{
        if (rangeObj.test(v)) {
            if (!min || minSV.compare(v) === 1) {
                min = v;
                minSV = new SemVer(min, options);
            }
        }
    });
    return min;
}
function minVersion(range, options) {
    range = new Range(range, options);
    let minver = new SemVer("0.0.0");
    if (range.test(minver)) {
        return minver;
    }
    minver = new SemVer("0.0.0-0");
    if (range.test(minver)) {
        return minver;
    }
    minver = null;
    for(let i = 0; i < range.set.length; ++i){
        const comparators = range.set[i];
        comparators.forEach((comparator)=>{
            const compver = new SemVer(comparator.semver.version);
            switch(comparator.operator){
                case ">":
                    if (compver.prerelease.length === 0) {
                        compver.patch++;
                    } else {
                        compver.prerelease.push(0);
                    }
                    compver.raw = compver.format();
                case "":
                case ">=":
                    if (!minver || gt(minver, compver)) {
                        minver = compver;
                    }
                    break;
                case "<":
                case "<=":
                    break;
                default:
                    throw new Error("Unexpected operation: " + comparator.operator);
            }
        });
    }
    if (minver && range.test(minver)) {
        return minver;
    }
    return null;
}
function validRange(range, options) {
    try {
        if (range === null) return null;
        return new Range(range, options).range || "*";
    } catch  {
        return null;
    }
}
function ltr(version, range, options) {
    return outside(version, range, "<", options);
}
function gtr(version, range, options) {
    return outside(version, range, ">", options);
}
function outside(version, range, hilo, options) {
    version = new SemVer(version, options);
    range = new Range(range, options);
    let gtfn;
    let ltefn;
    let ltfn;
    let comp;
    let ecomp;
    switch(hilo){
        case ">":
            gtfn = gt;
            ltefn = lte;
            ltfn = lt;
            comp = ">";
            ecomp = ">=";
            break;
        case "<":
            gtfn = lt;
            ltefn = gte;
            ltfn = gt;
            comp = "<";
            ecomp = "<=";
            break;
        default:
            throw new TypeError('Must provide a hilo val of "<" or ">"');
    }
    if (satisfies(version, range, options)) {
        return false;
    }
    for(let i = 0; i < range.set.length; ++i){
        const comparators = range.set[i];
        let high = null;
        let low = null;
        for (let comparator of comparators){
            if (comparator.semver === ANY) {
                comparator = new Comparator(">=0.0.0");
            }
            high = high || comparator;
            low = low || comparator;
            if (gtfn(comparator.semver, high.semver, options)) {
                high = comparator;
            } else if (ltfn(comparator.semver, low.semver, options)) {
                low = comparator;
            }
        }
        if (high === null || low === null) return true;
        if (high.operator === comp || high.operator === ecomp) {
            return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
            return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
            return false;
        }
    }
    return true;
}
function prerelease(version, options) {
    const parsed = parse(version, options);
    return parsed && parsed.prerelease.length ? parsed.prerelease : null;
}
function intersects(range1, range2, options) {
    range1 = new Range(range1, options);
    range2 = new Range(range2, options);
    return range1.intersects(range2);
}
const mod = {
    SEMVER_SPEC_VERSION: SEMVER_SPEC_VERSION,
    parse: parse,
    valid: valid,
    SemVer: SemVer,
    inc: inc,
    diff: diff,
    compareIdentifiers: compareIdentifiers,
    rcompareIdentifiers: rcompareIdentifiers,
    major: major,
    minor: minor,
    patch: patch,
    compare: compare,
    compareBuild: compareBuild,
    rcompare: rcompare,
    sort: sort,
    rsort: rsort,
    gt: gt,
    lt: lt,
    eq: eq,
    neq: neq,
    gte: gte,
    lte: lte,
    cmp: cmp,
    Comparator: Comparator,
    Range: Range,
    toComparators: toComparators,
    satisfies: satisfies,
    maxSatisfying: maxSatisfying,
    minSatisfying: minSatisfying,
    minVersion: minVersion,
    validRange: validRange,
    ltr: ltr,
    gtr: gtr,
    outside: outside,
    prerelease: prerelease,
    intersects: intersects,
    default: SemVer
};
const { Deno: Deno1  } = globalThis;
const noColor = typeof Deno1?.noColor === "boolean" ? Deno1.noColor : true;
let enabled = !noColor;
function code(open, close) {
    return {
        open: `\x1b[${open.join(";")}m`,
        close: `\x1b[${close}m`,
        regexp: new RegExp(`\\x1b\\[${close}m`, "g")
    };
}
function run(str, code) {
    return enabled ? `${code.open}${str.replace(code.regexp, code.open)}${code.close}` : str;
}
function red(str) {
    return run(str, code([
        31
    ], 39));
}
new RegExp([
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))", 
].join("|"), "g");
const ENV_KIND_NAME = "KIND_NAME";
const ENV_PRERELEASE_NEW_BUILD = "PRERELEASE_NEW_BUILD";
const ENV_MAJOR_LABELS = "MAJOR_LABELS";
const ENV_MINOR_LABELS = "MINOR_LABELS";
const ENV_PATCH_LABELS = "PATCH_LABELS";
const KIND_BETA = "beta";
const LABEL_IGNORE_FOR_RELEASE = "ignore-for-release";
const LABEL_BREAKING_CHANGE = "breaking-change";
const LABEL_ENHANCEMENT = "enhancement";
const LABEL_BUGFIX = "bugfix";
const LABEL_SECURITY = "security";
const REGEX_PULL_REQUEST = /#([0-9]+)/;
const GIT_COMMAND = "git";
const GIT_COMMAND_ARGUMENT_DESCRIBE = "describe";
const GIT_COMMAND_ARGUMENT_TAGS = "--tags";
const GIT_COMMAND_ARGUMENT_ABBREV_0 = "--abbrev=0";
const GIT_COMMAND_ARGUMENT_LOG = "log";
const GIT_COMMAND_ARGUMENT_DOTS_HEAD = "..HEAD";
const GIT_COMMAND_ARGUMENT_PRETTY_FORMAT_S = "--pretty=format:%s";
const GIT_COMMAND_ARGUMENT_TAG = "tag";
const GH_COMMAND = "gh";
const GH_COMMAND_ARGUMENT_PR = "pr";
const GH_COMMAND_ARGUMENT_VIEW = "view";
const GH_COMMAND_ARGUMENT_JSON = "--json";
const GH_COMMAND_ARGUMENT_LABELS = "title,labels";
const EMOJI_SHELL = "🐚";
const EMOJI_STABLE = "🚀";
const EMOJI_BETA = "🧪";
const EMOJI_ALPHA = "🚧";
const EMOJI_CUSTOM = "🔮";
const EMOJI_MAJOR = "💥";
const EMOJI_MINOR = "🎉";
const EMOJI_PATCH = "🐛";
const EMOJI_IGNORED = "🚫";
const EMOJI_UNKNOWN = "🟣";
const STYLE_FONT_WEIGHT_BOLD = "font-weight: bold";
const TEXT_EMPTY = "";
const TEXT_LINE_BREAK = "\n";
const TEXT_COMMA = ",";
const TEXT_VERSION_PREFIX = "v";
const TEXT_UNKNOWN = "unknown";
const TEXT_STABLE = "stable";
const TEXT_BETA = "beta";
const TEXT_ALPHA = "alpha";
const TEXT_MAJOR = "major";
const TEXT_MINOR = "minor";
const TEXT_PATCH = "patch";
const TEXT_ERROR_NO_PULL_REQUESTS_FOUND = "No pull requests found";
const TEXT_ERROR_NO_LABELS_FOUND = "No labels found";
const TEXT_LATEST_TAG = "Latest tag:";
const TEXT_PULL_REQUESTS = "Pull requests:";
const TEXT_NEW_TAG = "New tag:";
function getVariableAsString(variableName, defaultValue) {
    const value = Deno.env.get(variableName);
    if (value === undefined) {
        return defaultValue;
    }
    return value.trim();
}
function getVariableAsBoolean(variableName, defaultValue) {
    const value = Deno.env.get(variableName);
    if (value === undefined) {
        return defaultValue;
    }
    return value === "true" ? true : false;
}
function getVariableAsArray(variableName, defaultValue) {
    const value = Deno.env.get(variableName);
    if (value === undefined) {
        return defaultValue;
    }
    return value?.split(TEXT_COMMA);
}
async function runCommand(command, args = [], log = true) {
    if (log) {
        console.info(EMOJI_SHELL, command, ...args);
    }
    const { code , stdout , stderr  } = await Deno.spawn(command, {
        args
    });
    const output = new TextDecoder().decode(stdout).trim();
    const errorOutput = new TextDecoder().decode(stderr).trim();
    return {
        code,
        output,
        errorOutput
    };
}
async function getLatestTag() {
    const { code , output , errorOutput  } = await runCommand(GIT_COMMAND, [
        GIT_COMMAND_ARGUMENT_DESCRIBE,
        GIT_COMMAND_ARGUMENT_TAGS,
        GIT_COMMAND_ARGUMENT_ABBREV_0, 
    ], true);
    if (code !== 0) {
        throw new Error(errorOutput);
    }
    return output.trim();
}
async function getLog(currentTag) {
    const { code , output , errorOutput  } = await runCommand(GIT_COMMAND, [
        GIT_COMMAND_ARGUMENT_LOG,
        currentTag + GIT_COMMAND_ARGUMENT_DOTS_HEAD,
        GIT_COMMAND_ARGUMENT_PRETTY_FORMAT_S, 
    ], true);
    if (code !== 0) {
        throw new Error(errorOutput);
    }
    return output.split(TEXT_LINE_BREAK);
}
async function createTag(tagName) {
    const { code , errorOutput  } = await runCommand(GIT_COMMAND, [
        GIT_COMMAND_ARGUMENT_TAG,
        tagName, 
    ]);
    if (code === 0) {
        return true;
    }
    console.error(errorOutput);
    return false;
}
async function getTitleAndLabels(pullRequestId) {
    const result = {
        title: TEXT_UNKNOWN,
        labels: []
    };
    const { code , output , errorOutput  } = await runCommand(GH_COMMAND, [
        GH_COMMAND_ARGUMENT_PR,
        GH_COMMAND_ARGUMENT_VIEW,
        pullRequestId,
        GH_COMMAND_ARGUMENT_JSON,
        GH_COMMAND_ARGUMENT_LABELS, 
    ], false);
    if (code !== 0) {
        throw new Error(errorOutput);
    }
    const item = JSON.parse(output);
    const title = item.title;
    const labels = item.labels;
    result.title = title;
    for (const label of labels){
        const name = label.name;
        result.labels.push(name);
    }
    return result;
}
function formatWithEmoji(tagName, kindName = null) {
    let emoji = EMOJI_CUSTOM;
    if (kindName === null) {
        const version = mod.parse(tagName);
        const prerelease = version?.prerelease;
        if (prerelease === undefined || prerelease.length === 0) {
            kindName = TEXT_STABLE;
        } else {
            const prereleaseTag = prerelease[0];
            kindName = prereleaseTag;
        }
    }
    switch(kindName){
        case TEXT_STABLE:
            emoji = EMOJI_STABLE;
            break;
        case TEXT_BETA:
            emoji = EMOJI_BETA;
            break;
        case TEXT_ALPHA:
            emoji = EMOJI_ALPHA;
            break;
    }
    return `${emoji} ${tagName}`;
}
function getBumpNameById(id) {
    switch(id){
        case 1:
            return TEXT_MAJOR;
        case 2:
            return TEXT_MINOR;
        case 3:
            return TEXT_PATCH;
    }
    return TEXT_UNKNOWN;
}
function getMajor(tagName, targetKind = TEXT_EMPTY) {
    const targetVersion = mod.parse(tagName);
    if (targetVersion === null) {
        return TEXT_EMPTY;
    }
    targetVersion.major++;
    targetVersion.minor = 0;
    targetVersion.patch = 0;
    resetPrerelease(targetVersion, targetKind);
    return formatVersion(tagName, targetVersion);
}
function getMinor(tagName, targetKind = TEXT_EMPTY) {
    const targetVersion = mod.parse(tagName);
    if (targetVersion === null) {
        return TEXT_EMPTY;
    }
    targetVersion.minor++;
    targetVersion.patch = 0;
    resetPrerelease(targetVersion, targetKind);
    return formatVersion(tagName, targetVersion);
}
function getPatch(tagName, targetKind = TEXT_EMPTY) {
    const targetVersion = mod.parse(tagName);
    if (targetVersion === null) {
        return TEXT_EMPTY;
    }
    targetVersion.patch++;
    resetPrerelease(targetVersion, targetKind);
    return formatVersion(tagName, targetVersion);
}
function getPrerelease(tagName, targetKind = TEXT_EMPTY) {
    const targetVersion = mod.parse(tagName);
    if (targetVersion === null) {
        return TEXT_EMPTY;
    }
    updatePrerelease(targetVersion, targetKind);
    return formatVersion(tagName, targetVersion);
}
function updatePrerelease(targetVersion, targetKind) {
    const prerelease = targetVersion.prerelease;
    const kindName = prerelease[0];
    const currentCount = prerelease[1];
    targetVersion.prerelease[0] = targetKind;
    if (kindName === targetKind) {
        targetVersion.prerelease[1] = currentCount + 1;
    } else {
        targetVersion.prerelease[1] = 1;
    }
}
function resetPrerelease(targetVersion, targetKind = TEXT_EMPTY) {
    if (targetKind === TEXT_STABLE) {
        targetVersion.prerelease = [];
        return targetVersion;
    }
    targetVersion.prerelease[0] = targetKind;
    targetVersion.prerelease[1] = 1;
}
function formatVersion(tagName, targetVersion) {
    if (tagName.includes(TEXT_VERSION_PREFIX)) {
        return `${TEXT_VERSION_PREFIX}${targetVersion.format()}`;
    }
    return targetVersion.format();
}
let kind = KIND_BETA;
let prereleaseNewBuild = true;
let majorLabels = [
    LABEL_BREAKING_CHANGE
];
let minorLabels = [
    LABEL_ENHANCEMENT
];
let patchLabels = [
    LABEL_BUGFIX,
    LABEL_SECURITY
];
async function run1() {
    updateConfiguration();
    const tagName = await getLatestTag();
    const pullRequests = await getPullRequests(tagName);
    printTagName(tagName);
    const newBumpId = await getBumpIdByPullRequests(pullRequests);
    exitIfTagUnknown(newBumpId);
    const newBumpName = getBumpNameById(newBumpId);
    const newTagName = getTargetTag(newBumpName, tagName, kind);
    printTargetTag(newTagName);
    await createTag(newTagName);
}
function exitIfTagUnknown(bumpId) {
    if (bumpId === 100) {
        console.error(red(TEXT_ERROR_NO_LABELS_FOUND));
        Deno.exit(-1);
    }
}
function updateConfiguration() {
    kind = getVariableAsString(ENV_KIND_NAME, kind);
    prereleaseNewBuild = getVariableAsBoolean(ENV_PRERELEASE_NEW_BUILD, prereleaseNewBuild);
    majorLabels = getVariableAsArray(ENV_MAJOR_LABELS, majorLabels);
    minorLabels = getVariableAsArray(ENV_MINOR_LABELS, minorLabels);
    patchLabels = getVariableAsArray(ENV_PATCH_LABELS, patchLabels);
}
function printTagName(tagName) {
    console.info(TEXT_EMPTY);
    console.info(`%c${TEXT_LATEST_TAG} ${formatWithEmoji(tagName)}`, STYLE_FONT_WEIGHT_BOLD);
    console.info(TEXT_EMPTY);
}
async function getPullRequests(tagName) {
    const list = [];
    const logLines = await getLog(tagName);
    for (const logLine of logLines){
        const match = logLine.match(REGEX_PULL_REQUEST);
        if (match === null) {
            continue;
        }
        const id = match[1];
        list.push(id);
    }
    return list;
}
async function getBumpIdByPullRequests(pullRequests) {
    let result = 100;
    console.info(`%c${TEXT_PULL_REQUESTS}`, STYLE_FONT_WEIGHT_BOLD);
    for (const pullRequest of pullRequests){
        const { title , labels  } = await getTitleAndLabels(pullRequest);
        const bumpId = getBumpByLabels(labels);
        printPullRequest(bumpId, title);
        if (bumpId === 100) {
            continue;
        } else if (bumpId === 1) {
            result = bumpId;
            break;
        }
        if (bumpId < result) {
            result = bumpId;
        }
    }
    if (pullRequests.length === 0) {
        console.error(red(TEXT_ERROR_NO_PULL_REQUESTS_FOUND));
        Deno.exit(-1);
    }
    console.info(TEXT_EMPTY);
    return result;
}
function getBumpByLabels(labels) {
    const hasIgnoreForReleaseLabel = labels.includes(LABEL_IGNORE_FOR_RELEASE);
    if (hasIgnoreForReleaseLabel) {
        return 99;
    }
    const hasMajorLabel = majorLabels.filter((label)=>labels.includes(label)).length > 0;
    if (hasMajorLabel) {
        return 1;
    }
    const hasMinorLabel = minorLabels.filter((label)=>labels.includes(label)).length > 0;
    if (hasMinorLabel) {
        return 2;
    }
    const hasPatchLabel = patchLabels.filter((label)=>labels.includes(label)).length > 0;
    if (hasPatchLabel) {
        return 3;
    }
    return 100;
}
function getBumpEmojiById(id) {
    switch(id){
        case 1:
            return EMOJI_MAJOR;
        case 2:
            return EMOJI_MINOR;
        case 3:
            return EMOJI_PATCH;
        case 99:
            return EMOJI_IGNORED;
        case 100:
            return EMOJI_UNKNOWN;
    }
}
function printPullRequest(bumpId, pullRequestTitle) {
    const emoji = getBumpEmojiById(bumpId);
    console.info(`${emoji} ${pullRequestTitle}`);
}
function getTargetTag(targetBump, tagName, kind) {
    const isKindPrerelease = kind !== TEXT_STABLE;
    if (isKindPrerelease && prereleaseNewBuild) {
        return getPrerelease(tagName, kind);
    }
    switch(targetBump){
        case TEXT_MAJOR:
            return getMajor(tagName, kind);
        case TEXT_MINOR:
            return getMinor(tagName, kind);
        case TEXT_PATCH:
            return getPatch(tagName, kind);
    }
    return TEXT_UNKNOWN;
}
function printTargetTag(newTagName) {
    console.info(`%c${TEXT_NEW_TAG} ${formatWithEmoji(newTagName)}`, STYLE_FONT_WEIGHT_BOLD);
    console.info(TEXT_EMPTY);
}
run1();
