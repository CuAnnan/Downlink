(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.Decimal = factory());
}(this, function () { 'use strict';

  var padEnd = function (string, maxLength, fillString) {

    if (string == null || maxLength == null) {
      return string;
    }

    var result    = String(string);
    var targetLen = typeof maxLength === 'number'
      ? maxLength
      : parseInt(maxLength, 10);

    if (isNaN(targetLen) || !isFinite(targetLen)) {
      return result;
    }


    var length = result.length;
    if (length >= targetLen) {
      return result;
    }


    var filled = fillString == null ? '' : String(fillString);
    if (filled === '') {
      filled = ' ';
    }


    var fillLen = targetLen - length;

    while (filled.length < fillLen) {
      filled += filled;
    }

    var truncated = filled.length > fillLen ? filled.substr(0, fillLen) : filled;

    return result + truncated;
  };

  // consider adding them together pointless, just return the larger one

  var MAX_SIGNIFICANT_DIGITS = 17; // Highest value you can safely put here is Number.MAX_SAFE_INTEGER-MAX_SIGNIFICANT_DIGITS

  var EXP_LIMIT = 9e15; // The largest exponent that can appear in a Number, though not all mantissas are valid here.

  var NUMBER_EXP_MAX = 308; // The smallest exponent that can appear in a Number, though not all mantissas are valid here.

  var NUMBER_EXP_MIN = -324;

  var powerOf10 = function () {
    // We need this lookup table because Math.pow(10, exponent)
    // when exponent's absolute value is large is slightly inaccurate.
    // You can fix it with the power of math... or just make a lookup table.
    // Faster AND simpler
    var powersOf10 = [];

    for (var i = NUMBER_EXP_MIN + 1; i <= NUMBER_EXP_MAX; i++) {
      powersOf10.push(Number("1e" + i));
    }

    var indexOf0InPowersOf10 = 323;
    return function (power) {
      return powersOf10[power + indexOf0InPowersOf10];
    };
  }();

  var D = function D(value) {
    return value instanceof Decimal ? value : new Decimal(value);
  };

  var ME = function ME(mantissa, exponent) {
    return new Decimal().fromMantissaExponent(mantissa, exponent);
  };

  var ME_NN = function ME_NN(mantissa, exponent) {
    return new Decimal().fromMantissaExponent_noNormalize(mantissa, exponent);
  };

  function affordGeometricSeries(resourcesAvailable, priceStart, priceRatio, currentOwned) {
    var actualStart = priceStart.mul(priceRatio.pow(currentOwned));
    return Decimal.floor(resourcesAvailable.div(actualStart).mul(priceRatio.sub(1)).add(1).log10() / priceRatio.log10());
  }

  function sumGeometricSeries(numItems, priceStart, priceRatio, currentOwned) {
    return priceStart.mul(priceRatio.pow(currentOwned)).mul(Decimal.sub(1, priceRatio.pow(numItems))).div(Decimal.sub(1, priceRatio));
  }

  function affordArithmeticSeries(resourcesAvailable, priceStart, priceAdd, currentOwned) {
    // n = (-(a-d/2) + sqrt((a-d/2)^2+2dS))/d
    // where a is actualStart, d is priceAdd and S is resourcesAvailable
    // then floor it and you're done!
    var actualStart = priceStart.add(currentOwned.mul(priceAdd));
    var b = actualStart.sub(priceAdd.div(2));
    var b2 = b.pow(2);
    return b.neg().add(b2.add(priceAdd.mul(resourcesAvailable).mul(2)).sqrt()).div(priceAdd).floor();
  }

  function sumArithmeticSeries(numItems, priceStart, priceAdd, currentOwned) {
    var actualStart = priceStart.add(currentOwned.mul(priceAdd)); // (n/2)*(2*a+(n-1)*d)

    return numItems.div(2).mul(actualStart.mul(2).plus(numItems.sub(1).mul(priceAdd)));
  }

  function efficiencyOfPurchase(cost, currentRpS, deltaRpS) {
    return cost.div(currentRpS).add(cost.div(deltaRpS));
  }
  /**
   * The Decimal's value is simply mantissa * 10^exponent.
   */


  var Decimal =
  /** @class */
  function () {
    function Decimal(value) {
      /**
       * A number (double) with absolute value between [1, 10) OR exactly 0.
       * If mantissa is ever 10 or greater, it should be normalized
       * (divide by 10 and add 1 to exponent until it is less than 10,
       * or multiply by 10 and subtract 1 from exponent until it is 1 or greater).
       * Infinity/-Infinity/NaN will cause bad things to happen.
       */
      this.mantissa = NaN;
      /**
       * A number (integer) between -EXP_LIMIT and EXP_LIMIT.
       * Non-integral/out of bounds will cause bad things to happen.
       */

      this.exponent = NaN;

      if (value === undefined) {
        this.m = 0;
        this.e = 0;
      } else if (value instanceof Decimal) {
        this.fromDecimal(value);
      } else if (typeof value === "number") {
        this.fromNumber(value);
      } else {
        this.fromString(value);
      }
    }

    Object.defineProperty(Decimal.prototype, "m", {
      get: function get() {
        return this.mantissa;
      },
      set: function set(value) {
        this.mantissa = value;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(Decimal.prototype, "e", {
      get: function get() {
        return this.exponent;
      },
      set: function set(value) {
        this.exponent = value;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(Decimal.prototype, "s", {
      get: function get() {
        return this.sign();
      },
      set: function set(value) {
        if (value === 0) {
          this.e = 0;
          this.m = 0;
          return;
        }

        if (this.sgn() !== value) {
          this.m = -this.m;
        }
      },
      enumerable: true,
      configurable: true
    });

    Decimal.fromMantissaExponent = function (mantissa, exponent) {
      return new Decimal().fromMantissaExponent(mantissa, exponent);
    };

    Decimal.fromMantissaExponent_noNormalize = function (mantissa, exponent) {
      return new Decimal().fromMantissaExponent_noNormalize(mantissa, exponent);
    };

    Decimal.fromDecimal = function (value) {
      return new Decimal().fromDecimal(value);
    };

    Decimal.fromNumber = function (value) {
      return new Decimal().fromNumber(value);
    };

    Decimal.fromString = function (value) {
      return new Decimal().fromString(value);
    };

    Decimal.fromValue = function (value) {
      return new Decimal().fromValue(value);
    };

    Decimal.fromValue_noAlloc = function (value) {
      return value instanceof Decimal ? value : new Decimal(value);
    };

    Decimal.abs = function (value) {
      return D(value).abs();
    };

    Decimal.neg = function (value) {
      return D(value).neg();
    };

    Decimal.negate = function (value) {
      return D(value).neg();
    };

    Decimal.negated = function (value) {
      return D(value).neg();
    };

    Decimal.sign = function (value) {
      return D(value).sign();
    };

    Decimal.sgn = function (value) {
      return D(value).sign();
    };

    Decimal.round = function (value) {
      return D(value).round();
    };

    Decimal.floor = function (value) {
      return D(value).floor();
    };

    Decimal.ceil = function (value) {
      return D(value).ceil();
    };

    Decimal.trunc = function (value) {
      return D(value).trunc();
    };

    Decimal.add = function (value, other) {
      return D(value).add(other);
    };

    Decimal.plus = function (value, other) {
      return D(value).add(other);
    };

    Decimal.sub = function (value, other) {
      return D(value).sub(other);
    };

    Decimal.subtract = function (value, other) {
      return D(value).sub(other);
    };

    Decimal.minus = function (value, other) {
      return D(value).sub(other);
    };

    Decimal.mul = function (value, other) {
      return D(value).mul(other);
    };

    Decimal.multiply = function (value, other) {
      return D(value).mul(other);
    };

    Decimal.times = function (value, other) {
      return D(value).mul(other);
    };

    Decimal.div = function (value, other) {
      return D(value).div(other);
    };

    Decimal.divide = function (value, other) {
      return D(value).div(other);
    };

    Decimal.recip = function (value) {
      return D(value).recip();
    };

    Decimal.reciprocal = function (value) {
      return D(value).recip();
    };

    Decimal.reciprocate = function (value) {
      return D(value).reciprocate();
    };

    Decimal.cmp = function (value, other) {
      return D(value).cmp(other);
    };

    Decimal.compare = function (value, other) {
      return D(value).cmp(other);
    };

    Decimal.eq = function (value, other) {
      return D(value).eq(other);
    };

    Decimal.equals = function (value, other) {
      return D(value).eq(other);
    };

    Decimal.neq = function (value, other) {
      return D(value).neq(other);
    };

    Decimal.notEquals = function (value, other) {
      return D(value).notEquals(other);
    };

    Decimal.lt = function (value, other) {
      return D(value).lt(other);
    };

    Decimal.lte = function (value, other) {
      return D(value).lte(other);
    };

    Decimal.gt = function (value, other) {
      return D(value).gt(other);
    };

    Decimal.gte = function (value, other) {
      return D(value).gte(other);
    };

    Decimal.max = function (value, other) {
      return D(value).max(other);
    };

    Decimal.min = function (value, other) {
      return D(value).min(other);
    };

    Decimal.clamp = function (value, min, max) {
      return D(value).clamp(min, max);
    };

    Decimal.clampMin = function (value, min) {
      return D(value).clampMin(min);
    };

    Decimal.clampMax = function (value, max) {
      return D(value).clampMax(max);
    };

    Decimal.cmp_tolerance = function (value, other, tolerance) {
      return D(value).cmp_tolerance(other, tolerance);
    };

    Decimal.compare_tolerance = function (value, other, tolerance) {
      return D(value).cmp_tolerance(other, tolerance);
    };

    Decimal.eq_tolerance = function (value, other, tolerance) {
      return D(value).eq_tolerance(other, tolerance);
    };

    Decimal.equals_tolerance = function (value, other, tolerance) {
      return D(value).eq_tolerance(other, tolerance);
    };

    Decimal.neq_tolerance = function (value, other, tolerance) {
      return D(value).neq_tolerance(other, tolerance);
    };

    Decimal.notEquals_tolerance = function (value, other, tolerance) {
      return D(value).notEquals_tolerance(other, tolerance);
    };

    Decimal.lt_tolerance = function (value, other, tolerance) {
      return D(value).lt_tolerance(other, tolerance);
    };

    Decimal.lte_tolerance = function (value, other, tolerance) {
      return D(value).lte_tolerance(other, tolerance);
    };

    Decimal.gt_tolerance = function (value, other, tolerance) {
      return D(value).gt_tolerance(other, tolerance);
    };

    Decimal.gte_tolerance = function (value, other, tolerance) {
      return D(value).gte_tolerance(other, tolerance);
    };

    Decimal.log10 = function (value) {
      return D(value).log10();
    };

    Decimal.absLog10 = function (value) {
      return D(value).absLog10();
    };

    Decimal.pLog10 = function (value) {
      return D(value).pLog10();
    };

    Decimal.log = function (value, base) {
      return D(value).log(base);
    };

    Decimal.log2 = function (value) {
      return D(value).log2();
    };

    Decimal.ln = function (value) {
      return D(value).ln();
    };

    Decimal.logarithm = function (value, base) {
      return D(value).logarithm(base);
    };

    Decimal.pow10 = function (value) {
      if (Number.isInteger(value)) {
        return ME_NN(1, value);
      }

      return ME(Math.pow(10, value % 1), Math.trunc(value));
    };

    Decimal.pow = function (value, other) {
      // Fast track: 10^integer
      if (typeof value === "number" && value === 10 && typeof other === "number" && Number.isInteger(other)) {
        return ME_NN(1, other);
      }

      return D(value).pow(other);
    };

    Decimal.exp = function (value) {
      return D(value).exp();
    };

    Decimal.sqr = function (value) {
      return D(value).sqr();
    };

    Decimal.sqrt = function (value) {
      return D(value).sqrt();
    };

    Decimal.cube = function (value) {
      return D(value).cube();
    };

    Decimal.cbrt = function (value) {
      return D(value).cbrt();
    };
    /**
     * If you're willing to spend 'resourcesAvailable' and want to buy something
     * with exponentially increasing cost each purchase (start at priceStart,
     * multiply by priceRatio, already own currentOwned), how much of it can you buy?
     * Adapted from Trimps source code.
     */


    Decimal.affordGeometricSeries = function (resourcesAvailable, priceStart, priceRatio, currentOwned) {
      return affordGeometricSeries(D(resourcesAvailable), D(priceStart), D(priceRatio), currentOwned);
    };
    /**
     * How much resource would it cost to buy (numItems) items if you already have currentOwned,
     * the initial price is priceStart and it multiplies by priceRatio each purchase?
     */


    Decimal.sumGeometricSeries = function (numItems, priceStart, priceRatio, currentOwned) {
      return sumGeometricSeries(numItems, D(priceStart), D(priceRatio), currentOwned);
    };
    /**
     * If you're willing to spend 'resourcesAvailable' and want to buy something with additively
     * increasing cost each purchase (start at priceStart, add by priceAdd, already own currentOwned),
     * how much of it can you buy?
     */


    Decimal.affordArithmeticSeries = function (resourcesAvailable, priceStart, priceAdd, currentOwned) {
      return affordArithmeticSeries(D(resourcesAvailable), D(priceStart), D(priceAdd), D(currentOwned));
    };
    /**
     * How much resource would it cost to buy (numItems) items if you already have currentOwned,
     * the initial price is priceStart and it adds priceAdd each purchase?
     * Adapted from http://www.mathwords.com/a/arithmetic_series.htm
     */


    Decimal.sumArithmeticSeries = function (numItems, priceStart, priceAdd, currentOwned) {
      return sumArithmeticSeries(D(numItems), D(priceStart), D(priceAdd), D(currentOwned));
    };
    /**
     * When comparing two purchases that cost (resource) and increase your resource/sec by (deltaRpS),
     * the lowest efficiency score is the better one to purchase.
     * From Frozen Cookies:
     * http://cookieclicker.wikia.com/wiki/Frozen_Cookies_(JavaScript_Add-on)#Efficiency.3F_What.27s_that.3F
     */


    Decimal.efficiencyOfPurchase = function (cost, currentRpS, deltaRpS) {
      return efficiencyOfPurchase(D(cost), D(currentRpS), D(deltaRpS));
    };

    Decimal.randomDecimalForTesting = function (absMaxExponent) {
      // NOTE: This doesn't follow any kind of sane random distribution, so use this for testing purposes only.
      // 5% of the time, have a mantissa of 0
      if (Math.random() * 20 < 1) {
        return ME_NN(0, 0);
      }

      var mantissa = Math.random() * 10; // 10% of the time, have a simple mantissa

      if (Math.random() * 10 < 1) {
        mantissa = Math.round(mantissa);
      }

      mantissa *= Math.sign(Math.random() * 2 - 1);
      var exponent = Math.floor(Math.random() * absMaxExponent * 2) - absMaxExponent;
      return ME(mantissa, exponent);
      /*
        Examples:
              randomly test pow:
              var a = Decimal.randomDecimalForTesting(1000);
        var pow = Math.random()*20-10;
        if (Math.random()*2 < 1) { pow = Math.round(pow); }
        var result = Decimal.pow(a, pow);
        ["(" + a.toString() + ")^" + pow.toString(), result.toString()]
              randomly test add:
              var a = Decimal.randomDecimalForTesting(1000);
        var b = Decimal.randomDecimalForTesting(17);
        var c = a.mul(b);
        var result = a.add(c);
        [a.toString() + "+" + c.toString(), result.toString()]
      */
    };
    /**
     * When mantissa is very denormalized, use this to normalize much faster.
     */


    Decimal.prototype.normalize = function () {
      if (this.m >= 1 && this.m < 10) {
        return;
      } // TODO: I'm worried about mantissa being negative 0 here which is why I set it again, but it may never matter


      if (this.m === 0) {
        this.m = 0;
        this.e = 0;
        return;
      }

      var tempExponent = Math.floor(Math.log10(Math.abs(this.m)));
      this.m = this.m / powerOf10(tempExponent);
      this.e += tempExponent;
      return this;
    };

    Decimal.prototype.fromMantissaExponent = function (mantissa, exponent) {
      // SAFETY: don't let in non-numbers
      if (!isFinite(mantissa) || !isFinite(exponent)) {
        mantissa = Number.NaN;
        exponent = Number.NaN;
        return this;
      }

      this.m = mantissa;
      this.e = exponent; // Non-normalized mantissas can easily get here, so this is mandatory.

      this.normalize();
      return this;
    };
    /**
     * Well, you know what you're doing!
     */


    Decimal.prototype.fromMantissaExponent_noNormalize = function (mantissa, exponent) {
      this.m = mantissa;
      this.e = exponent;
      return this;
    };

    Decimal.prototype.fromDecimal = function (value) {
      this.m = value.m;
      this.e = value.e;
      return this;
    };

    Decimal.prototype.fromNumber = function (value) {
      // SAFETY: Handle Infinity and NaN in a somewhat meaningful way.
      if (isNaN(value)) {
        this.m = Number.NaN;
        this.e = Number.NaN;
      } else if (value === Number.POSITIVE_INFINITY) {
        this.m = 1;
        this.e = EXP_LIMIT;
      } else if (value === Number.NEGATIVE_INFINITY) {
        this.m = -1;
        this.e = EXP_LIMIT;
      } else if (value === 0) {
        this.m = 0;
        this.e = 0;
      } else {
        this.e = Math.floor(Math.log10(Math.abs(value))); // SAFETY: handle 5e-324, -5e-324 separately

        this.m = this.e === NUMBER_EXP_MIN ? value * 10 / 1e-323 : value / powerOf10(this.e); // SAFETY: Prevent weirdness.

        this.normalize();
      }

      return this;
    };

    Decimal.prototype.fromString = function (value) {
      if (value.indexOf("e") !== -1) {
        var parts = value.split("e");
        this.m = parseFloat(parts[0]);
        this.e = parseFloat(parts[1]); // Non-normalized mantissas can easily get here, so this is mandatory.

        this.normalize();
      } else if (value === "NaN") {
        this.m = Number.NaN;
        this.e = Number.NaN;
      } else {
        this.fromNumber(parseFloat(value));

        if (isNaN(this.m)) {
          throw Error("[DecimalError] Invalid argument: " + value);
        }
      }

      return this;
    };

    Decimal.prototype.fromValue = function (value) {
      if (value instanceof Decimal) {
        return this.fromDecimal(value);
      }

      if (typeof value === "number") {
        return this.fromNumber(value);
      }

      if (typeof value === "string") {
        return this.fromString(value);
      }

      this.m = 0;
      this.e = 0;
      return this;
    };

    Decimal.prototype.toNumber = function () {
      // Problem: new Decimal(116).toNumber() returns 115.99999999999999.
      // TODO: How to fix in general case? It's clear that if toNumber() is
      //  VERY close to an integer, we want exactly the integer.
      //  But it's not clear how to specifically write that.
      //  So I'll just settle with 'exponent >= 0 and difference between rounded
      //  and not rounded < 1e-9' as a quick fix.
      // var result = this.m*Math.pow(10, this.e);
      if (!isFinite(this.e)) {
        return Number.NaN;
      }

      if (this.e > NUMBER_EXP_MAX) {
        return this.m > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      }

      if (this.e < NUMBER_EXP_MIN) {
        return 0;
      } // SAFETY: again, handle 5e-324, -5e-324 separately


      if (this.e === NUMBER_EXP_MIN) {
        return this.m > 0 ? 5e-324 : -5e-324;
      }

      var result = this.m * powerOf10(this.e);

      if (!isFinite(result) || this.e < 0) {
        return result;
      }

      var resultRounded = Math.round(result);

      if (Math.abs(resultRounded - result) < 1e-10) {
        return resultRounded;
      }

      return result;
    };

    Decimal.prototype.mantissaWithDecimalPlaces = function (places) {
      // https://stackoverflow.com/a/37425022
      if (isNaN(this.m) || isNaN(this.e)) {
        return Number.NaN;
      }

      if (this.m === 0) {
        return 0;
      }

      var len = places + 1;
      var numDigits = Math.ceil(Math.log10(Math.abs(this.m)));
      var rounded = Math.round(this.m * Math.pow(10, len - numDigits)) * Math.pow(10, numDigits - len);
      return parseFloat(rounded.toFixed(Math.max(len - numDigits, 0)));
    };

    Decimal.prototype.toString = function () {
      if (isNaN(this.m) || isNaN(this.e)) {
        return "NaN";
      }

      if (this.e >= EXP_LIMIT) {
        return this.m > 0 ? "Infinity" : "-Infinity";
      }

      if (this.e <= -EXP_LIMIT || this.m === 0) {
        return "0";
      }

      if (this.e < 21 && this.e > -7) {
        return this.toNumber().toString();
      }

      return this.m + "e" + (this.e >= 0 ? "+" : "") + this.e;
    };

    Decimal.prototype.toExponential = function (places) {
      // https://stackoverflow.com/a/37425022
      // TODO: Some unfixed cases:
      //  new Decimal("1.2345e-999").toExponential()
      //  "1.23450000000000015e-999"
      //  new Decimal("1e-999").toExponential()
      //  "1.000000000000000000e-999"
      // TBH I'm tempted to just say it's a feature.
      // If you're doing pretty formatting then why don't you know how many decimal places you want...?
      if (isNaN(this.m) || isNaN(this.e)) {
        return "NaN";
      }

      if (this.e >= EXP_LIMIT) {
        return this.m > 0 ? "Infinity" : "-Infinity";
      }

      if (this.e <= -EXP_LIMIT || this.m === 0) {
        return "0" + (places > 0 ? padEnd(".", places + 1, "0") : "") + "e+0";
      } // two cases:
      // 1) exponent is < 308 and > -324: use basic toFixed
      // 2) everything else: we have to do it ourselves!


      if (this.e > NUMBER_EXP_MIN && this.e < NUMBER_EXP_MAX) {
        return this.toNumber().toExponential(places);
      }

      if (!isFinite(places)) {
        places = MAX_SIGNIFICANT_DIGITS;
      }

      var len = places + 1;
      var numDigits = Math.max(1, Math.ceil(Math.log10(Math.abs(this.m))));
      var rounded = Math.round(this.m * Math.pow(10, len - numDigits)) * Math.pow(10, numDigits - len);
      return rounded.toFixed(Math.max(len - numDigits, 0)) + "e" + (this.e >= 0 ? "+" : "") + this.e;
    };

    Decimal.prototype.toFixed = function (places) {
      if (isNaN(this.m) || isNaN(this.e)) {
        return "NaN";
      }

      if (this.e >= EXP_LIMIT) {
        return this.m > 0 ? "Infinity" : "-Infinity";
      }

      if (this.e <= -EXP_LIMIT || this.m === 0) {
        return "0" + (places > 0 ? padEnd(".", places + 1, "0") : "");
      } // two cases:
      // 1) exponent is 17 or greater: just print out mantissa with the appropriate number of zeroes after it
      // 2) exponent is 16 or less: use basic toFixed


      if (this.e >= MAX_SIGNIFICANT_DIGITS) {
        return this.m.toString().replace(".", "").padEnd(this.e + 1, "0") + (places > 0 ? padEnd(".", places + 1, "0") : "");
      }

      return this.toNumber().toFixed(places);
    };

    Decimal.prototype.toPrecision = function (places) {
      if (this.e <= -7) {
        return this.toExponential(places - 1);
      }

      if (places > this.e) {
        return this.toFixed(places - this.e - 1);
      }

      return this.toExponential(places - 1);
    };

    Decimal.prototype.valueOf = function () {
      return this.toString();
    };

    Decimal.prototype.toJSON = function () {
      return this.toString();
    };

    Decimal.prototype.toStringWithDecimalPlaces = function (places) {
      return this.toExponential(places);
    };

    Decimal.prototype.abs = function () {
      return ME_NN(Math.abs(this.m), this.e);
    };

    Decimal.prototype.neg = function () {
      return ME_NN(-this.m, this.e);
    };

    Decimal.prototype.negate = function () {
      return this.neg();
    };

    Decimal.prototype.negated = function () {
      return this.neg();
    };

    Decimal.prototype.sign = function () {
      return Math.sign(this.m);
    };

    Decimal.prototype.sgn = function () {
      return this.sign();
    };

    Decimal.prototype.round = function () {
      if (this.e < -1) {
        return new Decimal(0);
      }

      if (this.e < MAX_SIGNIFICANT_DIGITS) {
        return new Decimal(Math.round(this.toNumber()));
      }

      return this;
    };

    Decimal.prototype.floor = function () {
      if (this.e < -1) {
        return Math.sign(this.m) >= 0 ? new Decimal(0) : new Decimal(-1);
      }

      if (this.e < MAX_SIGNIFICANT_DIGITS) {
        return new Decimal(Math.floor(this.toNumber()));
      }

      return this;
    };

    Decimal.prototype.ceil = function () {
      if (this.e < -1) {
        return Math.sign(this.m) > 0 ? new Decimal(1) : new Decimal(0);
      }

      if (this.e < MAX_SIGNIFICANT_DIGITS) {
        return new Decimal(Math.ceil(this.toNumber()));
      }

      return this;
    };

    Decimal.prototype.trunc = function () {
      if (this.e < 0) {
        return new Decimal(0);
      }

      if (this.e < MAX_SIGNIFICANT_DIGITS) {
        return new Decimal(Math.trunc(this.toNumber()));
      }

      return this;
    };

    Decimal.prototype.add = function (value) {
      // figure out which is bigger, shrink the mantissa of the smaller
      // by the difference in exponents, add mantissas, normalize and return
      // TODO: Optimizations and simplification may be possible, see https://github.com/Patashu/break_infinity.js/issues/8
      var decimal = D(value);

      if (this.m === 0) {
        return decimal;
      }

      if (decimal.m === 0) {
        return this;
      }

      var biggerDecimal;
      var smallerDecimal;

      if (this.e >= decimal.e) {
        biggerDecimal = this;
        smallerDecimal = decimal;
      } else {
        biggerDecimal = decimal;
        smallerDecimal = this;
      }

      if (biggerDecimal.e - smallerDecimal.e > MAX_SIGNIFICANT_DIGITS) {
        return biggerDecimal;
      } // Have to do this because adding numbers that were once integers but scaled down is imprecise.
      // Example: 299 + 18


      return ME(Math.round(1e14 * biggerDecimal.m + 1e14 * smallerDecimal.m * powerOf10(smallerDecimal.e - biggerDecimal.e)), biggerDecimal.e - 14);
    };

    Decimal.prototype.plus = function (value) {
      return this.add(value);
    };

    Decimal.prototype.sub = function (value) {
      return this.add(D(value).neg());
    };

    Decimal.prototype.subtract = function (value) {
      return this.sub(value);
    };

    Decimal.prototype.minus = function (value) {
      return this.sub(value);
    };

    Decimal.prototype.mul = function (value) {
      // This version avoids an extra conversion to Decimal, if possible. Since the
      // mantissa is -10...10, any number short of MAX/10 can be safely multiplied in
      if (typeof value === "number") {
        if (value < 1e307 && value > -1e307) {
          return ME(this.m * value, this.e);
        } // If the value is larger than 1e307, we can divide that out of mantissa (since it's
        // greater than 1, it won't underflow)


        return ME(this.m * 1e-307 * value, this.e + 307);
      }

      var decimal = typeof value === "string" ? new Decimal(value) : value;
      return ME(this.m * decimal.m, this.e + decimal.e);
    };

    Decimal.prototype.multiply = function (value) {
      return this.mul(value);
    };

    Decimal.prototype.times = function (value) {
      return this.mul(value);
    };

    Decimal.prototype.div = function (value) {
      return this.mul(D(value).recip());
    };

    Decimal.prototype.divide = function (value) {
      return this.div(value);
    };

    Decimal.prototype.divideBy = function (value) {
      return this.div(value);
    };

    Decimal.prototype.dividedBy = function (value) {
      return this.div(value);
    };

    Decimal.prototype.recip = function () {
      return ME(1 / this.m, -this.e);
    };

    Decimal.prototype.reciprocal = function () {
      return this.recip();
    };

    Decimal.prototype.reciprocate = function () {
      return this.recip();
    };
    /**
     * -1 for less than value, 0 for equals value, 1 for greater than value
     */


    Decimal.prototype.cmp = function (value) {
      var decimal = D(value); // TODO: sign(a-b) might be better? https://github.com/Patashu/break_infinity.js/issues/12

      /*
      from smallest to largest:
            -3e100
      -1e100
      -3e99
      -1e99
      -3e0
      -1e0
      -3e-99
      -1e-99
      -3e-100
      -1e-100
      0
      1e-100
      3e-100
      1e-99
      3e-99
      1e0
      3e0
      1e99
      3e99
      1e100
      3e100
            */

      if (this.m === 0) {
        if (decimal.m === 0) {
          return 0;
        }

        if (decimal.m < 0) {
          return 1;
        }

        if (decimal.m > 0) {
          return -1;
        }
      }

      if (decimal.m === 0) {
        if (this.m < 0) {
          return -1;
        }

        if (this.m > 0) {
          return 1;
        }
      }

      if (this.m > 0) {
        if (decimal.m < 0) {
          return 1;
        }

        if (this.e > decimal.e) {
          return 1;
        }

        if (this.e < decimal.e) {
          return -1;
        }

        if (this.m > decimal.m) {
          return 1;
        }

        if (this.m < decimal.m) {
          return -1;
        }

        return 0;
      }

      if (this.m < 0) {
        if (decimal.m > 0) {
          return -1;
        }

        if (this.e > decimal.e) {
          return -1;
        }

        if (this.e < decimal.e) {
          return 1;
        }

        if (this.m > decimal.m) {
          return 1;
        }

        if (this.m < decimal.m) {
          return -1;
        }

        return 0;
      }

      throw Error("Unreachable code");
    };

    Decimal.prototype.compare = function (value) {
      return this.cmp(value);
    };

    Decimal.prototype.eq = function (value) {
      var decimal = D(value);
      return this.e === decimal.e && this.m === decimal.m;
    };

    Decimal.prototype.equals = function (value) {
      return this.eq(value);
    };

    Decimal.prototype.neq = function (value) {
      return !this.eq(value);
    };

    Decimal.prototype.notEquals = function (value) {
      return this.neq(value);
    };

    Decimal.prototype.lt = function (value) {
      var decimal = D(value);

      if (this.m === 0) {
        return decimal.m > 0;
      }

      if (decimal.m === 0) {
        return this.m <= 0;
      }

      if (this.e === decimal.e) {
        return this.m < decimal.m;
      }

      if (this.m > 0) {
        return decimal.m > 0 && this.e < decimal.e;
      }

      return decimal.m > 0 || this.e > decimal.e;
    };

    Decimal.prototype.lte = function (value) {
      return !this.gt(value);
    };

    Decimal.prototype.gt = function (value) {
      var decimal = D(value);

      if (this.m === 0) {
        return decimal.m < 0;
      }

      if (decimal.m === 0) {
        return this.m > 0;
      }

      if (this.e === decimal.e) {
        return this.m > decimal.m;
      }

      if (this.m > 0) {
        return decimal.m < 0 || this.e > decimal.e;
      }

      return decimal.m < 0 && this.e < decimal.e;
    };

    Decimal.prototype.gte = function (value) {
      return !this.lt(value);
    };

    Decimal.prototype.max = function (value) {
      var decimal = D(value);
      return this.lt(decimal) ? decimal : this;
    };

    Decimal.prototype.min = function (value) {
      var decimal = D(value);
      return this.gt(decimal) ? decimal : this;
    };

    Decimal.prototype.clamp = function (min, max) {
      return this.max(min).min(max);
    };

    Decimal.prototype.clampMin = function (min) {
      return this.max(min);
    };

    Decimal.prototype.clampMax = function (max) {
      return this.min(max);
    };

    Decimal.prototype.cmp_tolerance = function (value, tolerance) {
      var decimal = D(value);
      return this.eq_tolerance(decimal, tolerance) ? 0 : this.cmp(decimal);
    };

    Decimal.prototype.compare_tolerance = function (value, tolerance) {
      return this.cmp_tolerance(value, tolerance);
    };
    /**
     * Tolerance is a relative tolerance, multiplied by the greater of the magnitudes of the two arguments.
     * For example, if you put in 1e-9, then any number closer to the
     * larger number than (larger number)*1e-9 will be considered equal.
     */


    Decimal.prototype.eq_tolerance = function (value, tolerance) {
      var decimal = D(value); // https://stackoverflow.com/a/33024979
      // return abs(a-b) <= tolerance * max(abs(a), abs(b))

      return Decimal.lte(this.sub(decimal).abs(), Decimal.max(this.abs(), decimal.abs()).mul(tolerance));
    };

    Decimal.prototype.equals_tolerance = function (value, tolerance) {
      return this.eq_tolerance(value, tolerance);
    };

    Decimal.prototype.neq_tolerance = function (value, tolerance) {
      return !this.eq_tolerance(value, tolerance);
    };

    Decimal.prototype.notEquals_tolerance = function (value, tolerance) {
      return this.neq_tolerance(value, tolerance);
    };

    Decimal.prototype.lt_tolerance = function (value, tolerance) {
      var decimal = D(value);
      return !this.eq_tolerance(decimal, tolerance) && this.lt(decimal);
    };

    Decimal.prototype.lte_tolerance = function (value, tolerance) {
      var decimal = D(value);
      return this.eq_tolerance(decimal, tolerance) || this.lt(decimal);
    };

    Decimal.prototype.gt_tolerance = function (value, tolerance) {
      var decimal = D(value);
      return !this.eq_tolerance(decimal, tolerance) && this.gt(decimal);
    };

    Decimal.prototype.gte_tolerance = function (value, tolerance) {
      var decimal = D(value);
      return this.eq_tolerance(decimal, tolerance) || this.gt(decimal);
    };

    Decimal.prototype.log10 = function () {
      return this.e + Math.log10(this.m);
    };

    Decimal.prototype.absLog10 = function () {
      return this.e + Math.log10(Math.abs(this.m));
    };

    Decimal.prototype.pLog10 = function () {
      return this.m <= 0 || this.e < 0 ? 0 : this.log10();
    };

    Decimal.prototype.log = function (base) {
      // UN-SAFETY: Most incremental game cases are log(number := 1 or greater, base := 2 or greater).
      // We assume this to be true and thus only need to return a number, not a Decimal,
      return Math.LN10 / Math.log(base) * this.log10();
    };

    Decimal.prototype.log2 = function () {
      return 3.32192809488736234787 * this.log10();
    };

    Decimal.prototype.ln = function () {
      return 2.30258509299404568402 * this.log10();
    };

    Decimal.prototype.logarithm = function (base) {
      return this.log(base);
    };

    Decimal.prototype.pow = function (value) {
      // UN-SAFETY: Accuracy not guaranteed beyond ~9~11 decimal places.
      // TODO: Decimal.pow(new Decimal(0.5), 0); or Decimal.pow(new Decimal(1), -1);
      //  makes an exponent of -0! Is a negative zero ever a problem?
      var numberValue = value instanceof Decimal ? value.toNumber() : value; // TODO: Fast track seems about neutral for performance.
      //  It might become faster if an integer pow is implemented,
      //  or it might not be worth doing (see https://github.com/Patashu/break_infinity.js/issues/4 )
      // Fast track: If (this.e*value) is an integer and mantissa^value
      // fits in a Number, we can do a very fast method.

      var temp = this.e * numberValue;
      var newMantissa;

      if (Number.isSafeInteger(temp)) {
        newMantissa = Math.pow(this.m, numberValue);

        if (isFinite(newMantissa) && newMantissa !== 0) {
          return ME(newMantissa, temp);
        }
      } // Same speed and usually more accurate.


      var newExponent = Math.trunc(temp);
      var residue = temp - newExponent;
      newMantissa = Math.pow(10, numberValue * Math.log10(this.m) + residue);

      if (isFinite(newMantissa) && newMantissa !== 0) {
        return ME(newMantissa, newExponent);
      } // return Decimal.exp(value*this.ln());
      // UN-SAFETY: This should return NaN when mantissa is negative and value is non-integer.


      var result = Decimal.pow10(numberValue * this.absLog10()); // this is 2x faster and gives same values AFAIK

      if (this.sign() === -1 && numberValue % 2 === 1) {
        return result.neg();
      }

      return result;
    };

    Decimal.prototype.pow_base = function (value) {
      return D(value).pow(this);
    };

    Decimal.prototype.factorial = function () {
      // Using Stirling's Approximation.
      // https://en.wikipedia.org/wiki/Stirling%27s_approximation#Versions_suitable_for_calculators
      var n = this.toNumber() + 1;
      return Decimal.pow(n / Math.E * Math.sqrt(n * Math.sinh(1 / n) + 1 / (810 * Math.pow(n, 6))), n).mul(Math.sqrt(2 * Math.PI / n));
    };

    Decimal.prototype.exp = function () {
      var x = this.toNumber(); // Fast track: if -706 < this < 709, we can use regular exp.

      if (-706 < x && x < 709) {
        return Decimal.fromNumber(Math.exp(x));
      }

      return Decimal.pow(Math.E, x);
    };

    Decimal.prototype.sqr = function () {
      return ME(Math.pow(this.m, 2), this.e * 2);
    };

    Decimal.prototype.sqrt = function () {
      if (this.m < 0) {
        return new Decimal(Number.NaN);
      }

      if (this.e % 2 !== 0) {
        return ME(Math.sqrt(this.m) * 3.16227766016838, Math.floor(this.e / 2));
      } // Mod of a negative number is negative, so != means '1 or -1'


      return ME(Math.sqrt(this.m), Math.floor(this.e / 2));
    };

    Decimal.prototype.cube = function () {
      return ME(Math.pow(this.m, 3), this.e * 3);
    };

    Decimal.prototype.cbrt = function () {
      var sign = 1;
      var mantissa = this.m;

      if (mantissa < 0) {
        sign = -1;
        mantissa = -mantissa;
      }

      var newMantissa = sign * Math.pow(mantissa, 1 / 3);
      var mod = this.e % 3;

      if (mod === 1 || mod === -1) {
        return ME(newMantissa * 2.1544346900318837, Math.floor(this.e / 3));
      }

      if (mod !== 0) {
        return ME(newMantissa * 4.6415888336127789, Math.floor(this.e / 3));
      } // mod != 0 at this point means 'mod == 2 || mod == -2'


      return ME(newMantissa, Math.floor(this.e / 3));
    }; // Some hyperbolic trig functions that happen to be easy


    Decimal.prototype.sinh = function () {
      return this.exp().sub(this.negate().exp()).div(2);
    };

    Decimal.prototype.cosh = function () {
      return this.exp().add(this.negate().exp()).div(2);
    };

    Decimal.prototype.tanh = function () {
      return this.sinh().div(this.cosh());
    };

    Decimal.prototype.asinh = function () {
      return Decimal.ln(this.add(this.sqr().add(1).sqrt()));
    };

    Decimal.prototype.acosh = function () {
      return Decimal.ln(this.add(this.sqr().sub(1).sqrt()));
    };

    Decimal.prototype.atanh = function () {
      if (this.abs().gte(1)) {
        return Number.NaN;
      }

      return Decimal.ln(this.add(1).div(new Decimal(1).sub(this))) / 2;
    };
    /**
     * Joke function from Realm Grinder
     */


    Decimal.prototype.ascensionPenalty = function (ascensions) {
      if (ascensions === 0) {
        return this;
      }

      return this.pow(Math.pow(10, -ascensions));
    };
    /**
     * Joke function from Cookie Clicker. It's 'egg'
     */


    Decimal.prototype.egg = function () {
      return this.add(9);
    };

    Decimal.prototype.lessThanOrEqualTo = function (other) {
      return this.cmp(other) < 1;
    };

    Decimal.prototype.lessThan = function (other) {
      return this.cmp(other) < 0;
    };

    Decimal.prototype.greaterThanOrEqualTo = function (other) {
      return this.cmp(other) > -1;
    };

    Decimal.prototype.greaterThan = function (other) {
      return this.cmp(other) > 0;
    };

    Object.defineProperty(Decimal, "MAX_VALUE", {
      get: function get() {
        return MAX_VALUE;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(Decimal, "MIN_VALUE", {
      get: function get() {
        return MIN_VALUE;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(Decimal, "NUMBER_MAX_VALUE", {
      get: function get() {
        return NUMBER_MAX_VALUE;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(Decimal, "NUMBER_MIN_VALUE", {
      get: function get() {
        return NUMBER_MIN_VALUE;
      },
      enumerable: true,
      configurable: true
    });
    return Decimal;
  }();
  var MAX_VALUE = ME_NN(1, EXP_LIMIT);
  var MIN_VALUE = ME_NN(1, -EXP_LIMIT);
  var NUMBER_MAX_VALUE = D(Number.MAX_VALUE);
  var NUMBER_MIN_VALUE = D(Number.MIN_VALUE);

  return Decimal;

}));

},{}],2:[function(require,module,exports){
var charenc = {
  // UTF-8 encoding
  utf8: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      return charenc.bin.stringToBytes(unescape(encodeURIComponent(str)));
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      return decodeURIComponent(escape(charenc.bin.bytesToString(bytes)));
    }
  },

  // Binary encoding
  bin: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      for (var bytes = [], i = 0; i < str.length; i++)
        bytes.push(str.charCodeAt(i) & 0xFF);
      return bytes;
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      for (var str = [], i = 0; i < bytes.length; i++)
        str.push(String.fromCharCode(bytes[i]));
      return str.join('');
    }
  }
};

module.exports = charenc;

},{}],3:[function(require,module,exports){
(function() {
  var base64map
      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',

  crypt = {
    // Bit-wise rotation left
    rotl: function(n, b) {
      return (n << b) | (n >>> (32 - b));
    },

    // Bit-wise rotation right
    rotr: function(n, b) {
      return (n << (32 - b)) | (n >>> b);
    },

    // Swap big-endian to little-endian and vice versa
    endian: function(n) {
      // If number given, swap endian
      if (n.constructor == Number) {
        return crypt.rotl(n, 8) & 0x00FF00FF | crypt.rotl(n, 24) & 0xFF00FF00;
      }

      // Else, assume array and swap all items
      for (var i = 0; i < n.length; i++)
        n[i] = crypt.endian(n[i]);
      return n;
    },

    // Generate an array of any length of random bytes
    randomBytes: function(n) {
      for (var bytes = []; n > 0; n--)
        bytes.push(Math.floor(Math.random() * 256));
      return bytes;
    },

    // Convert a byte array to big-endian 32-bit words
    bytesToWords: function(bytes) {
      for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8)
        words[b >>> 5] |= bytes[i] << (24 - b % 32);
      return words;
    },

    // Convert big-endian 32-bit words to a byte array
    wordsToBytes: function(words) {
      for (var bytes = [], b = 0; b < words.length * 32; b += 8)
        bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
      return bytes;
    },

    // Convert a byte array to a hex string
    bytesToHex: function(bytes) {
      for (var hex = [], i = 0; i < bytes.length; i++) {
        hex.push((bytes[i] >>> 4).toString(16));
        hex.push((bytes[i] & 0xF).toString(16));
      }
      return hex.join('');
    },

    // Convert a hex string to a byte array
    hexToBytes: function(hex) {
      for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
      return bytes;
    },

    // Convert a byte array to a base-64 string
    bytesToBase64: function(bytes) {
      for (var base64 = [], i = 0; i < bytes.length; i += 3) {
        var triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        for (var j = 0; j < 4; j++)
          if (i * 8 + j * 6 <= bytes.length * 8)
            base64.push(base64map.charAt((triplet >>> 6 * (3 - j)) & 0x3F));
          else
            base64.push('=');
      }
      return base64.join('');
    },

    // Convert a base-64 string to a byte array
    base64ToBytes: function(base64) {
      // Remove non-base-64 characters
      base64 = base64.replace(/[^A-Z0-9+\/]/ig, '');

      for (var bytes = [], i = 0, imod4 = 0; i < base64.length;
          imod4 = ++i % 4) {
        if (imod4 == 0) continue;
        bytes.push(((base64map.indexOf(base64.charAt(i - 1))
            & (Math.pow(2, -2 * imod4 + 8) - 1)) << (imod4 * 2))
            | (base64map.indexOf(base64.charAt(i)) >>> (6 - imod4 * 2)));
      }
      return bytes;
    }
  };

  module.exports = crypt;
})();

},{}],4:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],5:[function(require,module,exports){
(function(){
  var crypt = require('crypt'),
      utf8 = require('charenc').utf8,
      isBuffer = require('is-buffer'),
      bin = require('charenc').bin,

  // The core
  md5 = function (message, options) {
    // Convert to byte array
    if (message.constructor == String)
      if (options && options.encoding === 'binary')
        message = bin.stringToBytes(message);
      else
        message = utf8.stringToBytes(message);
    else if (isBuffer(message))
      message = Array.prototype.slice.call(message, 0);
    else if (!Array.isArray(message))
      message = message.toString();
    // else, assume byte array already

    var m = crypt.bytesToWords(message),
        l = message.length * 8,
        a =  1732584193,
        b = -271733879,
        c = -1732584194,
        d =  271733878;

    // Swap endian
    for (var i = 0; i < m.length; i++) {
      m[i] = ((m[i] <<  8) | (m[i] >>> 24)) & 0x00FF00FF |
             ((m[i] << 24) | (m[i] >>>  8)) & 0xFF00FF00;
    }

    // Padding
    m[l >>> 5] |= 0x80 << (l % 32);
    m[(((l + 64) >>> 9) << 4) + 14] = l;

    // Method shortcuts
    var FF = md5._ff,
        GG = md5._gg,
        HH = md5._hh,
        II = md5._ii;

    for (var i = 0; i < m.length; i += 16) {

      var aa = a,
          bb = b,
          cc = c,
          dd = d;

      a = FF(a, b, c, d, m[i+ 0],  7, -680876936);
      d = FF(d, a, b, c, m[i+ 1], 12, -389564586);
      c = FF(c, d, a, b, m[i+ 2], 17,  606105819);
      b = FF(b, c, d, a, m[i+ 3], 22, -1044525330);
      a = FF(a, b, c, d, m[i+ 4],  7, -176418897);
      d = FF(d, a, b, c, m[i+ 5], 12,  1200080426);
      c = FF(c, d, a, b, m[i+ 6], 17, -1473231341);
      b = FF(b, c, d, a, m[i+ 7], 22, -45705983);
      a = FF(a, b, c, d, m[i+ 8],  7,  1770035416);
      d = FF(d, a, b, c, m[i+ 9], 12, -1958414417);
      c = FF(c, d, a, b, m[i+10], 17, -42063);
      b = FF(b, c, d, a, m[i+11], 22, -1990404162);
      a = FF(a, b, c, d, m[i+12],  7,  1804603682);
      d = FF(d, a, b, c, m[i+13], 12, -40341101);
      c = FF(c, d, a, b, m[i+14], 17, -1502002290);
      b = FF(b, c, d, a, m[i+15], 22,  1236535329);

      a = GG(a, b, c, d, m[i+ 1],  5, -165796510);
      d = GG(d, a, b, c, m[i+ 6],  9, -1069501632);
      c = GG(c, d, a, b, m[i+11], 14,  643717713);
      b = GG(b, c, d, a, m[i+ 0], 20, -373897302);
      a = GG(a, b, c, d, m[i+ 5],  5, -701558691);
      d = GG(d, a, b, c, m[i+10],  9,  38016083);
      c = GG(c, d, a, b, m[i+15], 14, -660478335);
      b = GG(b, c, d, a, m[i+ 4], 20, -405537848);
      a = GG(a, b, c, d, m[i+ 9],  5,  568446438);
      d = GG(d, a, b, c, m[i+14],  9, -1019803690);
      c = GG(c, d, a, b, m[i+ 3], 14, -187363961);
      b = GG(b, c, d, a, m[i+ 8], 20,  1163531501);
      a = GG(a, b, c, d, m[i+13],  5, -1444681467);
      d = GG(d, a, b, c, m[i+ 2],  9, -51403784);
      c = GG(c, d, a, b, m[i+ 7], 14,  1735328473);
      b = GG(b, c, d, a, m[i+12], 20, -1926607734);

      a = HH(a, b, c, d, m[i+ 5],  4, -378558);
      d = HH(d, a, b, c, m[i+ 8], 11, -2022574463);
      c = HH(c, d, a, b, m[i+11], 16,  1839030562);
      b = HH(b, c, d, a, m[i+14], 23, -35309556);
      a = HH(a, b, c, d, m[i+ 1],  4, -1530992060);
      d = HH(d, a, b, c, m[i+ 4], 11,  1272893353);
      c = HH(c, d, a, b, m[i+ 7], 16, -155497632);
      b = HH(b, c, d, a, m[i+10], 23, -1094730640);
      a = HH(a, b, c, d, m[i+13],  4,  681279174);
      d = HH(d, a, b, c, m[i+ 0], 11, -358537222);
      c = HH(c, d, a, b, m[i+ 3], 16, -722521979);
      b = HH(b, c, d, a, m[i+ 6], 23,  76029189);
      a = HH(a, b, c, d, m[i+ 9],  4, -640364487);
      d = HH(d, a, b, c, m[i+12], 11, -421815835);
      c = HH(c, d, a, b, m[i+15], 16,  530742520);
      b = HH(b, c, d, a, m[i+ 2], 23, -995338651);

      a = II(a, b, c, d, m[i+ 0],  6, -198630844);
      d = II(d, a, b, c, m[i+ 7], 10,  1126891415);
      c = II(c, d, a, b, m[i+14], 15, -1416354905);
      b = II(b, c, d, a, m[i+ 5], 21, -57434055);
      a = II(a, b, c, d, m[i+12],  6,  1700485571);
      d = II(d, a, b, c, m[i+ 3], 10, -1894986606);
      c = II(c, d, a, b, m[i+10], 15, -1051523);
      b = II(b, c, d, a, m[i+ 1], 21, -2054922799);
      a = II(a, b, c, d, m[i+ 8],  6,  1873313359);
      d = II(d, a, b, c, m[i+15], 10, -30611744);
      c = II(c, d, a, b, m[i+ 6], 15, -1560198380);
      b = II(b, c, d, a, m[i+13], 21,  1309151649);
      a = II(a, b, c, d, m[i+ 4],  6, -145523070);
      d = II(d, a, b, c, m[i+11], 10, -1120210379);
      c = II(c, d, a, b, m[i+ 2], 15,  718787259);
      b = II(b, c, d, a, m[i+ 9], 21, -343485551);

      a = (a + aa) >>> 0;
      b = (b + bb) >>> 0;
      c = (c + cc) >>> 0;
      d = (d + dd) >>> 0;
    }

    return crypt.endian([a, b, c, d]);
  };

  // Auxiliary functions
  md5._ff  = function (a, b, c, d, x, s, t) {
    var n = a + (b & c | ~b & d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._gg  = function (a, b, c, d, x, s, t) {
    var n = a + (b & d | c & ~d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._hh  = function (a, b, c, d, x, s, t) {
    var n = a + (b ^ c ^ d) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };
  md5._ii  = function (a, b, c, d, x, s, t) {
    var n = a + (c ^ (b | ~d)) + (x >>> 0) + t;
    return ((n << s) | (n >>> (32 - s))) + b;
  };

  // Package private blocksize
  md5._blocksize = 16;
  md5._digestsize = 16;

  module.exports = function (message, options) {
    if (message === undefined || message === null)
      throw new Error('Illegal argument ' + message);

    var digestbytes = crypt.wordsToBytes(md5(message, options));
    return options && options.asBytes ? digestbytes :
        options && options.asString ? bin.bytesToString(digestbytes) :
        crypt.bytesToHex(digestbytes);
  };

})();

},{"charenc":2,"crypt":3,"is-buffer":4}],6:[function(require,module,exports){
const helpers = require('./Helpers');
let alphabetGrid = [];

class Alphabet
{
    static build()
    {
        let searchSpace = '';
        for(let i = 0; i < 10; i++)
        {
            searchSpace += ''+i;
        }

        for(let i = 0; i < 26; i++)
        {
            // add the letters a through z in upper and lower case by their character code
            searchSpace += String.fromCharCode(i + 65);
            searchSpace += String.fromCharCode(i + 97);
        }
        alphabetGrid = searchSpace.split('');
        this.shuffle();
    }

    static shuffle()
    {
        this.randomizedAlphabet = helpers.shuffleArray([...alphabetGrid]);
    }

    static getRandomLetter()
    {
        if(!(this.randomizedAlphabet && this.randomizedAlphabet.length))
        {
            this.shuffle();
        }

        return this.randomizedAlphabet.pop();
    }

    /**
     * In the general case, we don't need to keep the state of a given alphabet that's being used, we just need a random
     * letter. But in the case of, for example, the Alphanumeric password, we need the alphabet grid in its totality.
     * We return a clone of the array for versatility's sake
     */
    static getAlphabetGrid()
    {
        return [...alphabetGrid];
    }
}

Alphabet.build();

module.exports = Alphabet;

},{"./Helpers":27}],7:[function(require,module,exports){
const   ComputerGenerator = require('../Computers/ComputerGenerator'),
        helper = require('../Helpers'),
        companyNames = require('./companies');

/**
 * @type {Array.<Company>}
 */
let companies = [],
    /** @type {boolean} */
    locationsSet = false;


class Company
{
    constructor(name)
    {
        this.name = name;

        /**
         * @type {number} the reward modifier this company offers the player
         * this is based on the accrued successful missions and the number of times the company has detected you hacking
         * one of their servers
         */
        this.playerRespectModifier = 1;
        /**
         * @type {number} the reward modifier this company offers the player
         * this is the increase exponent for successfully achieved missions
         */
        this.securityLevel = 1;
    }

    setPublicServer(publicServer)
    {
        this.publicServer = publicServer;
        publicServer.setCompany(this);
    }

    addComputer(computer)
    {
        this.computers.push(computer);
    }

    finishMission(mission)
    {
        this.playerRespectModifier *= Company.missionSuccessIncreaseExponent;
    }

    traceHacker()
    {
        this.playerRespectModifier /= Company.hackDetectedExponent;
    }

    static get hackDetectedExponent()
    {
        return 1.02;
    }

    increaseSecurityLevel()
    {
        this.securityLevel *= Company.securityIncreaseExponent;
    }

    static get securityIncreaseExponent()
    {
        return 1.009;
    }

    static get missionSuccessIncreaseExponent()
    {
        return 1.0085;
    }

    /**
     * @returns {[<Company>]}
     */
    static get allCompanies()
    {
        return companies;
    }

    static setAllPublicServerLocations(validWorldMapPoints)
    {
        if(locationsSet)
        {
            return;
        }

        for(let company of companies)
        {
            company.publicServer.setLocation(helper.popRandomArrayElement(validWorldMapPoints));
        }
        locationsSet = true;
    }

    toJSON()
    {

        let json = {
            name:this.name,
            publicServer:this.publicServer.toJSON(),
            playerRespectModifier:this.playerRespectModifier,
            securityLevel:this.securityLevel
        };

        return json;
    }

    static loadCompaniesFromJSON(companiesJSON)
    {
        companies = [];
        for(let companyJSON of companiesJSON)
        {
            companies.push(Company.fromJSON(companyJSON));
        }
    }

    static fromJSON(companyJSON)
    {
        let company = new Company(companyJSON.name);
        company.setPublicServer(ComputerGenerator.fromJSON(companyJSON.publicServer));
        company.playerRespectModifier = parseFloat(companyJSON.playerRespectModifier);
        company.securityLevel = parseFloat(companyJSON.securityLevel);
        locationsSet = true;
        return company;
    }

    static buildCompanyList()
    {
        companies = [];
        for(let companyName of companyNames)
        {
            let company = new Company(companyName);
            company.setPublicServer(ComputerGenerator.newPublicServer(company));
            companies.push(company);
        }
    }
}


module.exports = Company;

},{"../Computers/ComputerGenerator":12,"../Helpers":27,"./companies":8}],8:[function(require,module,exports){
let companyNames = [
    "Mike Rowe soft",
    "Pear",
    "Outel",
    "Ice",
    "Tomsung",
    "Popsy",
    "Ohm Djezis",
    "Fizzer",
    "Wonder",
    "Global Hyper Mega Compunet",
    "Athena",
    "Hybrides",
    'Grimes Inc',
    'Wehner - Spencer',
    'Spinka Group',
    'Towne, Kilback and Mills',
    'Krajcik - Willms',
    'Wisoky - Jaskolski',
    'Pouros, DuBuque and Ledner',
    'Waelchi, Balistreri and Rath',
    'Ortiz, Dare and Schmitt',
    'Wilderman - Hackett',
    'Ortiz - Waelchi',
    'Nitzsche, Rowe and Murphy',
    'McGlynn - Leannon',
    'Lesch - Davis',
    'Russel, Hamill and Kozey',
    'Corkery - Grant',
    'Koepp, McGlynn and Glover',
    'Schmidt Group',
    'Prosacco - Lueilwitz',
    'McCullough - Kulas',
    'Fritsch and Sons',
    'Lemke and Sons',
    'Langworth, Kuhic and Schaden',
    'Borer and Sons',
    'Glover - Renner',
    'Zboncak, Lind and Stroman',
    'McKenzie, Williamson and Klocko',
    'Kub, Pfannerstill and Walker',
    'Herzog, Schmidt and Gaylord',
    'Gerlach, Harris and Hartmann',
    'Feest - Friesen',
    'Schaefer, Fahey and Wuckert',
    'Parker, Effertz and Moen',
    'Zulauf - Mueller',
    'Windler, Walker and Keebler',
    'Beatty, Rau and Renner',
    'Bernier - Marvin',
    'Auer and Sons',
    'Walter - Hagenes',
    'Harvey and Sons',
    "Tógan Labs", // with permission from Eilís Ní Fhlannagáin
];

module.exports = companyNames;

},{}],9:[function(require,module,exports){
const   Task = require('./Tasks/Task'),
        Upgradeable = require('../Upgradeable'),
        cpus = require('./cpus');

class CPUFullError extends Error{}
class CPUDuplicateTaskError extends Error{}
class InvalidTaskError extends Error{}

const CPU_COST_MODIFIER = 4000;

class CPU extends Upgradeable
{
    constructor(name, speed, img, lifeCycle, lifeCycleUsed)
    {
        super();
        let defaultCPU = cpus[0];
        /**
         * @type {string}
         */
        this.name = name?name:defaultCPU.name;
        /**
         * @type {number}
         */
        this.baseSpeed = parseInt(speed?speed:defaultCPU.speed);
        /**
         * @type {string} the rgb() color for the cpu
         */
        this.img = img?img:defaultCPU.img;
        /**
         * @type {Array.<Task>}
         */
        this.tasks = [];
        /**
         * @type {number}
         */
        this.baseLifeCycle = parseInt(lifeCycle?lifeCycle:defaultCPU.lifeCycle);
        this.lifeCycleUsed = parseInt(lifeCycleUsed?lifeCycleUsed:0);
        this.living = this.lifeCycleUsed < this.lifeCycle;
    }

    get lifeCycle()
    {
        let lifeCycle = this.baseLifeCycle;
        if(CPU.upgrades && CPU.upgrades.lifeCycle)
        {
            for(let amount of CPU.upgrades.lifeCycle)
            {
                lifeCycle *= amount;
            }
        }
        return lifeCycle;
    }

    get speed()
    {
        let speed = this.baseSpeed;
        if(CPU.upgrades && CPU.upgrades.speed)
        {
            for(let amount of CPU.upgrades.speed)
            {
                speed *= amount;
            }
        }
        return speed;
    }

    get remainingLifeCycle()
    {
        return Math.max(this.lifeCycle - this.lifeCycleUsed, 0);
    }

    get health()
    {
        if(this.lifeCycleUsed >= this.lifeCycle)
        {
            return 0;
        }
        let decimal = this.remainingLifeCycle / this.lifeCycle,
            percentage = decimal * 100,
            fixed = percentage.toFixed(2);
        return fixed;
    }

    toJSON()
    {
        let json = {
            name:this.name,
            speed:this.baseSpeed.toString(),
            img:this.img,
            lifeCycle:this.baseLifeCycle.toString(),
            lifeCycleUsed:this.lifeCycleUsed.toString()
        };
        return json;
    }

    static fromJSON(json)
    {
        return new CPU(json.name, json.speed, json.img, json.lifeCycle, json.lifeCycleUsed);
    }

    static getCPUs()
    {
        return cpus;
    }

    static getCPUByName(name)
    {
        let cpuData = cpus.filter(cpu=>{return cpu.name === name});
        if(!cpuData.length)
        {
            throw new Error('No CPU found');
        }
        return this.fromJSON(cpuData);
    }

    tick(load)
    {
        this.lifeCycleUsed += load;
        if(this.lifeCycleUsed >= this.lifeCycle)
        {
            this.living = false;
            this.trigger('burnOut');
        }
        this.trigger('lifeCycleUpdated');
    }

    /**
     * @param cpuData
     */
    static getPriceFor(cpuData)
    {
        return cpuData.lifeCycle * cpuData.speed / CPU_COST_MODIFIER;
    }

    static get deadImage()
    {
        return 'cpu-dead.png';
    }

    get healthImage()
    {
        return this.living?this.img:CPU.deadImage;
    }

    static get loadReduction()
    {
        return 1;
    }
}


module.exports = CPU;

},{"../Upgradeable":35,"./Tasks/Task":21,"./cpus":22}],10:[function(require,module,exports){
const   CPU = require('./CPU'),
        Task = require('./Tasks/Task'),
        helpers = require('../Helpers'),
        EventListener = require('../EventListener');

/*
 * Custom exceptions
 */
class NoFreeCPUCyclesError extends Error{}
class CPUDuplicateTaskError extends Error{}
class InvalidTaskError extends Error{}

class CPUPool extends EventListener
{
    /**
     * @param {Array.<CPU>} cpus   The CPUs to add into the cpu pool
     * @param {number} maxCPUs      The maximum number of CPUs in the pool
     */
    constructor(cpus, maxCPUs)
    {
        super();
        /**
         * @type {Array.<CPU>}
         */
        this.cpus = [];

        /**
         * @type {number}
         */
        this.maxCPUs = maxCPUs;

        if(cpus.length > this.maxCPUs)
        {
            throw new Error("More CPUs than allotted amount");
        }
        /**
         * @type {number} The average speed of all cpus in the pool
         */
        this.totalSpeed = 0;
        /**
         * @type {number} The total cycles used by all tasks
         */
        this.load = 0;
        /**
         * * @type {Array.<Task>}
         */
        this.tasks = [];

        /**
         * @type {Object.<string, Task>}
         */
        this.tasksByHash = {};

        /**
         * @type {number} The number of CPUs. Because entries can be null, this needs to be counted
         */
        this.cpuCount = 0;

        for(let cpu of cpus)
        {
            this.addCPU(cpu);
        }

        CPU.on('upgrade', ()=>{
            this.update();
        });
    }

    get width()
    {
        return Math.ceil(Math.sqrt(this.maxCPUs));
    }

    increaseCPUSize()
    {
        this.maxCPUs += this.width;
    }

    /**
     * @param {CPU} cpu
     */
    addCPU(cpu)
    {
        this.setCPUSlot(this.cpus.length, cpu);
    }

    setCPUSlot(slot, cpu)
    {
        if(cpu)
        {
            cpu.once('burnOut', ()=>{
                this.flagCPUDead(slot, cpu);
            });
            this.cpus[slot] = cpu;
            this.update();
        }
        else
        {
            this.cpus[slot] = null;
        }
    }

    flagCPUDead(slot, cpu)
    {
        this.trigger('cpuBurnedOut', slot, cpu);
        this.update();
        if(this.cpuCount === 0)
        {
            this.trigger('cpuPoolEmpty');
        }
    }

    update()
    {
        this.totalSpeed = 0;
        this.cpuCount = 0;
        for(let cpu of this.cpus)
        {
            if(cpu && cpu.living)
            {
                this.totalSpeed += cpu.speed;
                this.cpuCount ++;
            }
        }
    }

    /**
     * Add a task to the cpu pool
     * @param {Task} task   The task to be added
     */
    addTask(task)
    {
        // if it's not a task, complain
        if (!(task instanceof Task))
        {
            throw new InvalidTaskError('Tried to add a non task object to a processor');
        }
        // if it's already in the pool, complain
        if(this.tasks.indexOf(task)>=0)
        {
            throw new CPUDuplicateTaskError('This task is already on the CPU');
        }
        let freeCycles = this.availableCycles;
        // if you don't have the free oomph, complain
        if(task.minimumRequiredCycles > freeCycles)
        {
            throw new NoFreeCPUCyclesError(`CPU pool does not have the required cycles for ${task.name}. Need ${task.minimumRequiredCycles.toString()} but only have ${freeCycles}.`);
        }

        task.on('complete', ()=>{ this.completeTask(task); });

        this.load += task.minimumRequiredCycles;
        this.tasks.push(task);
        this.tasksByHash[task.hash] = task;
        this.updateLoadBalance();
    }

    /**
     * Finish a task and remove it from the cpu pool
     * @param {Task} task
     */
    completeTask(task)
    {
        let freedCycles = task.cyclesPerTick;

        helpers.removeArrayElement(this.tasks, task);
        delete this.tasksByHash[task.hash];
        this.load -= task.minimumRequiredCycles;

        if(this.tasks.length >= 1)
        {
            let freedCyclesPerTick = Math.floor(freedCycles / this.tasks.length);
            let i = 0;
            while(i < this.tasks.length && freedCycles > (0))
            {
                let task = this.tasks[i];
                freedCycles -= freedCyclesPerTick;
                task.addCycles(freedCyclesPerTick);
                i++;
            }
        }
        this.updateLoadBalance();
        this.trigger('taskComplete');
    }

    removeTasks(tasks)
    {
        for(let task of tasks)
        {
            helpers.removeArrayElement(this.tasks, task);
            delete this.tasksByHash[task.hash];
        }
    }

    get availableCycles()
    {
        return this.totalSpeed - this.load;
    }

    alterCPULoad(taskHash, direction)
    {
        let task = this.tasksByHash[taskHash];
        if(task)
        {
            task.alterWeight(direction);
        }
        return this.updateLoadBalance();
    }

    updateLoadBalance()
    {
        if(this.tasks.length === 0)
        {
            return;
        }
        let totalWeight = 0;

        for(let task of this.tasks)
        {
            totalWeight += task.weight;
        }

        let weightedFreeSpace = this.availableCycles / totalWeight;
        let results = {};

        try
        {
            for (let task of this.tasks)
            {
                let weightedCycles = weightedFreeSpace * task.weight,
                    taskCycles = weightedCycles + task.minimumRequiredCycles,
                    cyclePercentage = (taskCycles / this.totalSpeed * 100).toFixed(2);
                task.setCyclesPerTick(Math.floor(taskCycles));
                task.setLoadPercentage(cyclePercentage);
                results[task.hash] = cyclePercentage;
            }
        }
        catch(e)
        {
            if(e.constructor.name === 'CPUOverloadError')
            {
                this.pauseAllTasks();
            }
        }

        return results;
    }

    pauseAllTasks()
    {
        for (let task of this.tasks)
        {
            task.pause();
        }
    }

    /**
     *
     * @returns {Array.<Task>}
     */
    tick()
    {
        let tasks = [];
        let averageLoad = 0;
        for(let task of this.tasks)
        {
            averageLoad += task.tick();
            // we do this because the task could be removed from this.tasks after ticking
            // so it would be lost reference wise and we would have no way of updating it later
            tasks.push(task);
        }
        for(let cpu of this.cpus)
        {
            if(cpu && cpu.remainingLifeCycle > 0)
            {
                cpu.tick(averageLoad);
            }
        }
        return tasks;
    }
}

module.exports = CPUPool;

},{"../EventListener":25,"../Helpers":27,"./CPU":9,"./Tasks/Task":21}],11:[function(require,module,exports){
const EventListener = require('../EventListener');

class Computer extends EventListener
{
    /**
     *
     * @param {string}      name      The name of the computer
     * @param {string|null} ipAddress The ipAddress, if none provided a random ip address
     */
    constructor(name, ipAddress)
    {
        super();
        this.name= name;

        this.ipAddress = ipAddress?ipAddress:Computer.randomIPAddress();
        this.location = null;
        this.company = null;
    }

    static randomIPAddress()
    {
        let ipAddress = "";
        for(let i = 0; i < 4; i++)
        {
            if(i)
            {
                ipAddress += '.';
            }
            ipAddress += Math.floor(Math.random() * 256);
        }
        return ipAddress;
    }

    setCompany(company)
    {
        this.company = company;
    }

    get simpleHash()
    {
        return this.name+'::'+this.ipAddress;
    }

    setLocation(location)
    {
        this.location = location;
        return this;
    }

    connect()
    {
        return this;
    }

    disconnect()
    {
        return this;
    }

    tick()
    {

    }

    static fromJSON(json, company)
    {
        let computer = new this(json.name, json.ipAddress);

        computer.location = json.location;
        computer.company = company;
        return computer;
    }

    toJSON()
    {
        return {
            className:this.constructor.name,
            name:this.name,
            ipAddress:this.ipAddress,
            location:this.location
        };
    }


}

module.exports = Computer;

},{"../EventListener":25}],12:[function(require,module,exports){
const   PlayerComputer = require('./PlayerComputer'),
        Computer = require('./Computer'),
        CPU = require('./CPU'),
        PublicComputer= require('./PublicComputer'),
        MissionComputer = require('../Missions/MissionComputer'),
        constructors = {PlayerComputer:PlayerComputer, PublicComputer:PublicComputer, MissionComputer:MissionComputer},
        helpers = require('../Helpers');

class ComputerGenerator
{
    constructor()
    {
        this.canvasContext = null;
        this.boundaries = {};
    }

    /**
     * In order to determine valid locations for any new computer, the class needs a reference to the image so that
     * a random point on the image|map is on a land mass. This method builds up a canvas and throws the image onto
     * the canvas. The canvas' context is then bound as an instance variable
     * @see getRandomLandboundPoint
     * @param {object} canvas
     */
    defineMapImage(canvas)
    {

        this.boundaries = {
            x:{min:0, max:canvas.width},
            y:{min:0, max:canvas.height}
        };
        this.canvasContext = canvas.getContext('2d');
        return this;
    }

    newPlayerComputer(location)
    {
        let potato = new PlayerComputer([
            new CPU(),
            new CPU(),
            new CPU(),
            new CPU()
        ]);
        potato.setLocation(location);
        return potato;
    }

    newPublicServer(company)
    {
        let server = new PublicComputer(company.name+' Public Server');
        server.setCompany(company);
        return server;
    }

    fromJSON(computerJSON, company)
    {
        let computer = constructors[computerJSON.className].fromJSON(computerJSON, company);
        return computer;
    }
}



module.exports = new ComputerGenerator();

},{"../Helpers":27,"../Missions/MissionComputer":33,"./CPU":9,"./Computer":11,"./PlayerComputer":14,"./PublicComputer":15}],13:[function(require,module,exports){
const Computer = require('./Computer');

/**
 * This class' only current reason to exist is to act as a separate parent class for Mission Computer and Player Computer
 * but may develop further purpose later (file structure springs immediately to mind)
 */
class MechanicalComputer extends Computer
{

}

module.exports = MechanicalComputer;
},{"./Computer":11}],14:[function(require,module,exports){
const   {Password, DictionaryPassword, AlphanumericPassword} = require('../Missions/Challenges/Password'),
        helpers = require('../Helpers'),
        {DictionaryCracker, PasswordCracker, SequentialAttacker} = require('./Tasks/PasswordCracker'),
        Encryption = require('../Missions/Challenges/Encryption'),
        EncryptionCracker = require('./Tasks/EncryptionCracker'),
        ResearchTask = require('./Tasks/ResearchTask'),
        MechanicalComputer = require('./MechanicalComputer'),
        CPUPool = require('./CPUPool'),
        CPU = require('./CPU.js');

class InvalidTaskError extends Error{}
const DEFAULT_MAX_CPUS = 4;


class PlayerComputer extends MechanicalComputer
{
    constructor(cpus, maxCPUs)
    {
        super('Home', null, '127.0.0.1');
        this.cpuPool = new CPUPool(cpus, maxCPUs?maxCPUs:DEFAULT_MAX_CPUS);
        this.cpuPool.on('cpuBurnedOut', (slot, cpu)=>{
            this.trigger('cpuBurnedOut', slot, cpu);
        }).on("cpuPoolEmpty", ()=>{
            this.trigger('cpuPoolEmpty');
        });
        /**
         * @type {Array.<Task>}
         */
        this.missionTasks = [];
    }

    get cpus()
    {
        return this.cpuPool.cpus;
    }

    addCPU(cpu)
    {
        this.cpuPool.addCPU(cpu);
    }

    increaseCPUPoolSize()
    {
        this.cpuPool.increaseCPUSize();
    }

    /**
     * Exposing the CPU pool width
     */
    get cpuWidth()
    {
        return this.cpuPool.width;
    }

    setCPUSlot(slot, cpu)
    {
        this.cpuPool.setCPUSlot(slot, cpu);
        return this;
    }

    /**
     * @param challenge
     * @returns {Task}
     */
    getTaskForChallenge(challenge)
    {
        let task = null;

        if(challenge instanceof Encryption)
        {
            task = new EncryptionCracker(challenge);
        }
        else if(challenge instanceof DictionaryPassword)
        {
            task = new DictionaryCracker(challenge);
        }
        else if(challenge instanceof AlphanumericPassword)
        {
            task = new SequentialAttacker(challenge);
        }
        else
        {
            throw new InvalidTaskError('Unknown task');
        }


        return task;
    }

    clearMissionTasks()
    {
        this.cpuPool.removeTasks(this.missionTasks);
    }

    addTaskForChallenge(challenge)
    {
        let task = this.getTaskForChallenge(challenge);
        this.missionTasks.push(task);
        task.on("complete", ()=>{
            helpers.removeArrayElement(this.missionTasks, task);
        });
        this.cpuPool.addTask(task);
    }

    tick()
    {
        return this.cpuPool.tick();
    }

    alterCPULoad(taskHash, direction)
    {
        return this.cpuPool.alterCPULoad(taskHash, direction);
    }

    updateLoadBalance()
    {
        return this.cpuPool.updateLoadBalance();
    }

    /**
     * @param {Research} researchItem
     */
    startResearchTask(researchItem)
    {
        let researchTask = new ResearchTask(researchItem);
        this.cpuPool.addTask(researchTask);
    }

    get tasks()
    {
        return this.cpuPool.tasks;
    }

    toJSON()
    {
        let json = super.toJSON();
        json.maxCPUs = this.cpuPool.maxCPUs;
        json.cpus = [];
        for(let cpu of this.cpus)
        {
            if(cpu)
            {
                json.cpus.push(cpu.toJSON());
            }
            else
            {
                json.cpus.push(null);
            }
        }
        return json;
    }

    static fromJSON(json)
    {
        let cpus = [];
        for(let cpuJSON of json.cpus)
        {
            if(cpuJSON)
            {
                cpus.push(CPU.fromJSON(cpuJSON));
            }
            else
            {
                cpus.push(null);
            }
        }
        let pc = new PlayerComputer(cpus, json.maxCPUs);
        pc.setLocation(json.location);
        return pc;
    }

    get currentCPUTasks()
    {
        return this.cpuPool.tasks;
    }

    updateCPUPool()
    {
        this.cpuPool.update();
    }
}

module.exports = PlayerComputer;

},{"../Helpers":27,"../Missions/Challenges/Encryption":29,"../Missions/Challenges/Password":30,"./CPU.js":9,"./CPUPool":10,"./MechanicalComputer":13,"./Tasks/EncryptionCracker":18,"./Tasks/PasswordCracker":19,"./Tasks/ResearchTask":20}],15:[function(require,module,exports){
let Computer = require('./Computer');

let allPublicComputers = {};

class PublicComputer extends Computer
{
    constructor(name, ipAddress)
    {
        super(name, ipAddress);
        let keys = Object.keys(allPublicComputers);
        while(keys.indexOf(this.ipAddress) >= 0)
        {
            this.ipAddress = Computer.randomIPAddress();
        }
        allPublicComputers[this.ipAddress] = this;
    }

    static getPublicComputerByIPAddress(hash)
    {
        return allPublicComputers[hash];
    }

    static getAllKnownPublicServers()
    {
        return allPublicComputers;
    }
}

module.exports = PublicComputer;

},{"./Computer":11}],16:[function(require,module,exports){
const   helpers = require('../../Helpers'),
        upgradeables = {
            CPU:require('../CPU'),
            Connection:require('../../Connection'),
        },
        EventListener = require('../../EventListener');

class ResearchEffect
{
    constructor(property, amount)
    {
        this.property = property;
        this.amount = amount;
    }

    toJSON()
    {
        return {
            property:this.property,
            amount:this.amount
        }
    }
}

class Research extends EventListener
{
    constructor(name, classEffected, propertiesEffected, researchTicks, amountDone)
    {
        super();
        this.name = name;
        this.classEffected = classEffected;
        this.propertiesEffected = propertiesEffected;
        this.researchTicks = researchTicks;
        this.amountDone = amountDone;
        this.researchCompleted = amountDone >= researchTicks;
    }

    setTask(task)
    {
        this.task = task;
        return this;
    }

    solve()
    {
        this.completeResearch();
    }

    completeResearch()
    {
        this.researchCompleted = true;
        this.classEffected.applyResearchUpgrade(this.propertiesEffected);
        this.trigger('complete')
    }

    setAmountDone(amountDone)
    {
        this.amountDone = Math.min(amountDone, this.researchTicks);
    }

    toJSON()
    {
        return {
            name:this.name,
            classEffected:this.classEffected.constructor.name,
            propertiesEffected:this.propertiesEffected,
            researchTicks:this.researchTicks,
            amountDone:this.amountDone
        };
    }

    static fromJSON(json)
    {
        let properties = [];
        for(let property of json.propertiesEffected)
        {
            properties.push(new ResearchEffect(property.property, property.amount));
        }
        return new Research(
            json.name,
            upgradeables[json.className],
            properties,
            json.researchTicks,
            json.amountDone?json.amountDone:0
        )
    }

    static loadJSON(researchData)
    {
        let researches = {}, allResearches = {};
        for (let className in researchData)
        {
            let classResearchData = researchData[className];
            researches[className] = [];
            for (let researchDatum of classResearchData)
            {
                researchDatum.className = className;
                let research = this.fromJSON(researchDatum);
                researches[className].push(research);
                allResearches[researchDatum.name] = research;
            }
        }
        this.categoryResearches = researches;
        this.allResearches = allResearches;
        this.applySavedResearch(Object.values(allResearches).filter(research=>research.researchCompleted))
    }

    static applySavedResearch(savedResearches)
    {
        savedResearches.forEach((research)=>{
            research.completeResearch();
        });
    }

    static loadDefaultJSON()
    {
        const researchData = require('./researchData');
        this.loadJSON(researchData);
    }

    static get availableResearch()
    {
        let research = {};
        for(let researchType in this.categoryResearches)
        {
            research[researchType] = this.categoryResearches[researchType].filter(research => !research.researchCompleted);
        }
        return research;
    }

    static getItemByName(name)
    {
        return Research.allResearches[name];
    }
}
const researchFactor = 6000;

module.exports = Research;

},{"../../Connection":23,"../../EventListener":25,"../../Helpers":27,"../CPU":9,"./researchData":17}],17:[function(require,module,exports){
let researchData = {
    CPU:[
        {name:"Overclocking", propertiesEffected:[{property:"speed", amount:1.5}, {property:"lifeCycle",amount:0.9}], researchTicks:40000},
        {name:"Room Temperature Superconductors", propertiesEffected:[{property:"speed", amount:2}, {property:"lifeCycle", amount:1.2}], researchTicks:200000},
        {name:"Quantum Substrate Transistors", propertiesEffected:[{property:"speed",amount:4}, {property:"lifeCycle",amount:2}], researchTicks: 1000000},
        {name:"Superstate Collapsifiers", propertiesEffected:[{property:"speed",amount:8}, {property:"lifeCycle",amount:4}], researchTicks:10000000}
    ]
};

module.exports = researchData;

},{}],18:[function(require,module,exports){
const   Alphabet = require('../../Alphabet'),
        helpers = require('../../Helpers'),
        Task = require('./Task');


class EncryptionCell
{
    constructor()
    {
        this.solved = false;
        this.letter = Alphabet.getRandomLetter();
    }

    solve()
    {
        this.solved = true;
        this.letter = '0';
    }

    tick()
    {
        if(this.solved)
        {
            return;
        }
        this.letter = Alphabet.getRandomLetter();
    }
}

class EncryptionCracker extends Task
{
    constructor(encryption)
    {
        super('Encryption Cracker', encryption);
        this.rows = encryption.rows;
        this.cols = encryption.cols;

        /**
         *
         * @type {number}
         */
        this.cyclesPerTick = 0;
        /**
         * The amount of progress you have made on the current tick
         */
        this.currentTickPercentage = 0;

        /**
         * @type {Array.<Array.<EncryptionCell>>}
         */
        this.grid = [];
        /**
         * @type {Array.<EncryptionCell>}
         */
        this.cells = [];
        /**
         * @type {Array.<EncryptionCell>}
         */
        this.unsolvedCells = [];
        for(let i = 0; i < this.rows; i++)
        {
            let row = [];
            this.grid.push(row);

            for(let j = 0; j < this.cols; j++)
            {
                let cell = new EncryptionCell();
                row[j] = cell;
                this.cells.push(cell);
                this.unsolvedCells.push(cell);
            }
        }
    }


    solveNCells(cellsToSolve)
    {
        this.trigger('start');
        for(let i = 0; i < cellsToSolve; i++)
        {
            let cell = helpers.getRandomArrayElement(this.unsolvedCells);
            if(cell)
            {
                cell.solve();
                helpers.removeArrayElement(this.unsolvedCells, cell);
            }
        }
        if(!this.unsolvedCells.length)
        {
            this.signalComplete();
        }

    }

    /**
     * This should hopefully update the graphic properly
     * @returns {Array<EncryptionCell>}
     */
    get cellsForAnimating()
    {
        return this.cells;
    }

    get percentage()
    {
        return (this.cells.length - this.unsolvedCells.length) / (this.cells.length);
    }

    get solved()
    {
        return this.unsolvedCells.length === 0;
    }

    // figure out how many cells to solve
    // I'm trying to figure out how to make this longer
    // this may lead to a number less than zero and so, this tick, nothing will happen

    setCyclesPerTick(cyclesPerTick)
    {
        super.setCyclesPerTick(cyclesPerTick);
        this.attacksPerTick = Math.floor(Math.pow(Math.min(this.cols, this.rows), 1/Math.pow(this.challenge.difficulty, 1.5)));
        return this;
    }

    processTick()
    {
        // Cycle through all of the cells and tick them.
        for (let cell of this.unsolvedCells)
        {
            cell.tick();
        }

        this.currentTickPercentage += this.attacksPerTick;

        // if the currentTickPercentage is bigger than one, we solve that many cells
        if(this.currentTickPercentage >= 1)
        {
            let fullCells = Math.floor(this.currentTickPercentage);
            this.currentTickPercentage -= fullCells;
            this.solveNCells(fullCells);
        }
    }

    static fromJSON(json)
    {
        json = json?json:{rows:10,cols:10,difficulty:50};
        return new EncryptionCracker(json.rows, json.cols, json.difficulty);
    }
}

module.exports = EncryptionCracker;

},{"../../Alphabet":6,"../../Helpers":27,"./Task":21}],19:[function(require,module,exports){
const   DICTIONARY_CRACKER_MINIMUM_CYCLES = 5,
        SEQUENTIAL_CRACKER_MINIMUM_CYCLES = 20,
        Task = require('./Task'),
        Alphabet = require('../../Alphabet');

class PasswordCracker extends Task
{
    constructor(password, name, minimumRequiredCycles)
    {
        super(name, password, minimumRequiredCycles);
        this.currentGuess = null;
        this.attacksPerTick = 0;
    }



    setCyclesPerTick(cyclesPerTick)
    {
        super.setCyclesPerTick(cyclesPerTick);
        this.attacksPerTick = Math.floor(Math.pow(cyclesPerTick, 1/Math.pow(this.challenge.difficulty, 1.5)));
        return this;
    }

    attackPassword()
    {
        if(!this.challenge.solved)
        {
            let result = this.challenge.attack(this.currentGuess);
            if (result)
            {
                this.signalComplete();
            }
            return result;
        }
    }

}


class DictionaryCracker extends PasswordCracker
{
    constructor(password)
    {
        super(password, 'Dictionary Cracker', DICTIONARY_CRACKER_MINIMUM_CYCLES);
        this.dictionary = [...password.dictionary];
        this.totalGuesses = 0;
    }

    processTick()
    {
        if(!this.solved)
        {
            let attacking = true,
                guessesThisTick = 0;

            while(attacking)
            {
                this.currentGuess = this.dictionary[this.totalGuesses++];
                let guessSuccessful = this.attackPassword();
                if(guessSuccessful || guessesThisTick++ >= this.attacksPerTick)
                {
                    attacking = false;
                }
            }
        }
    }
}

class SequentialAttacker extends PasswordCracker
{
    constructor(password)
    {
        super(password, 'Sequential Cracker', SEQUENTIAL_CRACKER_MINIMUM_CYCLES);
        this.currentGuess = '';
        this.lettersSolved = 0;

        for(let i = 0; i < password.length; i++)
        {
            this.currentGuess += '*';
        }
        this.alphabetGrid = Alphabet.getAlphabetGrid();
    }

    getNextLetter()
    {
        if(!this.alphabetGrid.length)
        {
            this.alphabetGrid = Alphabet.getAlphabetGrid();
        }
        return this.alphabetGrid.pop();
    }

    processTick()
    {
        let attacking = true,
            guessesThisTick = 0;
        while(attacking)
        {
            let letterGuess = this.getNextLetter();
            if(this.challenge.attackLetter(letterGuess))
            {
                this.currentGuess = this.currentGuess.substr(0, this.lettersSolved++) + letterGuess + this.currentGuess.substr(this.lettersSolved);
            }
            let guessSuccessful = this.attackPassword();
            if(guessSuccessful || guessesThisTick++ >= this.attacksPerTick)
            {
                attacking = false;
            }
        }
    }
}

module.exports = {
    PasswordCracker:PasswordCracker,
    DictionaryCracker:DictionaryCracker,
    SequentialAttacker:SequentialAttacker
};

},{"../../Alphabet":6,"./Task":21}],20:[function(require,module,exports){
const   Task = require ('./Task'),
        helpers = require('../../Helpers');

class ResearchTask extends Task
{
    /**
     * @param {Research} researchItem
     */
    constructor(researchItem)
    {
        super('Researching '+researchItem.name, researchItem, 0);
        this.researchDone = 0;
        /**
         * While this is also stored in this.challenge, lexically it makes less sense.
         * @type {Research}
         */
        this.researchItem = researchItem;
        this.minimumRequiredCycles = 10;
    }

    processTick()
    {
        this.researchDone += this.cyclesPerTick;
        this.researchItem.setAmountDone(this.researchDone);
        if(this.researchDone >= this.researchItem.researchTicks)
        {
            this.researchDone = this.researchItem.researchTicks;
            this.signalComplete();
        }
    }

}

module.exports = ResearchTask;

},{"../../Helpers":27,"./Task":21}],21:[function(require,module,exports){
const   EventListener = require('../../EventListener'),
        Decimal = require('break_infinity.js');

class CPUOverloadError extends Error
{
    constructor(task, cycles)
    {
        super(`Trying to run a task (${task.name}) with fewer cycles ${cycles} than it requires ${task.minimumRequiredCycles}`);
        this.task = task;
        this.cycles = cycles;
    }
}

class Task extends EventListener
{
    constructor(name, challenge, minimumRequiredCycles)
    {
        super();
        this.name= name;
        this.minimumRequiredCycles = minimumRequiredCycles?minimumRequiredCycles:challenge.difficulty;
        this.cyclesPerTick = 0;
        this.weight = 1;
        this.difficultyRatio = 0;
        this.ticksTaken = 0;
        this.working = true;
        this.completed = false;
        this.challenge = challenge?challenge.setTask(this):null;
        this.loadPercentage = 0;
    }

    get hash()
    {
        return this.challenge.hash;
    }



    alterWeight(direction)
    {
        if(direction > 0)
        {
            this.weight *= 2;
        }
        else
        {
            this.weight /= 2;
        }
    }

    setCyclesPerTick(cyclesPerTick)
    {
        if(cyclesPerTick < this.minimumRequiredCycles)
        {
            throw new CPUOverloadError(this, cyclesPerTick);
        }
        this.cyclesPerTick = cyclesPerTick;
        return this;
    }

    setLoadPercentage(loadPercentage)
    {
        this.loadPercentage = loadPercentage;
    }

    addCycles(tickIncrease)
    {
        this.cyclesPerTick += tickIncrease;
    }

    /**
     * Try to release a number of ticks from the task and return the number actually released
     * @param {number} tickReduction
     * @returns {number|*}
     */
    freeCycles(tickReduction)
    {
        // figure out how many freeable ticks we have
        const freeableTicks = this.cyclesPerTick-this.minimumRequiredCycles;
        // if it's one or less, free none and return 0
        let ticksToFree = 0;
        if(freeableTicks > 1)
        {
            if(freeableTicks > tickReduction)
            {
                ticksToFree = tickReduction;
            }
            else
            {
                ticksToFree = Math.floor(freeableTicks / 2);
            }
        }
        this.cyclesPerTick -= ticksToFree;
        return ticksToFree;
    }

    signalComplete()
    {
        this.working = false;
        this.completed = true;
        this.trigger('complete');
        this.challenge.solve();
    }

    tick()
    {
        if(this.working)
        {
            this.ticksTaken++;
            this.processTick();
            return this.minimumRequiredCycles;
        }
        return 0;
    }

    pause()
    {
        this.working = false;
        console.log("Paused "+this.name);
        return this;
    }

    resume()
    {
        this.working = true;
        return this;
    }
}

module.exports = Task;

},{"../../EventListener":25,"break_infinity.js":1}],22:[function(require,module,exports){
let cpus = [
    {name:"Garbo Processor", speed:20, lifeCycle:20000, img:'cpu-i.png'},
    {name:"Garbo Processor II", speed:40, lifeCycle:40000, img:'cpu-ii.png'},
    {name:"Garbo Processor II.5", speed:80, lifeCycle:60000, img:'cpu-iii.png'},
    {name:"Garbo Processor BLT", speed:133, lifeCycle: 100000, img:'cpu-iv.png'}
];


module.exports = cpus;

},{}],23:[function(require,module,exports){
const   Computer = require('./Computers/Computer'),
        PublicComputer = require('./Computers/PublicComputer'),
        EventListener = require('./EventListener'),
        helpers = require('./Helpers'),
        md5 = require('md5');

class InvalidTypeError extends Error{}
class InvalidComputerError extends Error{}
//class DuplicateComputerError extends Error{}

let connections = 0;

class ConnectionStep extends EventListener
{
    /**
     * A class to represent the connection between two computers as it is being traced.
     * @param {Computer} computer1
     * @param {Computer} computer2
     */
    constructor(computer1, computer2)
    {
        super();
        /**
         * Similarly Connections traceTicks property, this is just an iteration counter that can be used if needed
         * @type {number}
         */
        this.traceTicks = 0;
        /**
         * The first computer in this link
         * @type {Computer}
         */
        this.computer1 = computer1;
        /**
         * The second computer in this link
         * @type {Computer}
         */
        this.computer2 = computer2;
        /**
         * An abstract number governing how much of this link has been traced
         * @type {number}
         */
        this.amountTraced = 0;
        /**
         * A connection can have one of three states, as defined by the Connection.states enum
         * @type {string}
         */
        this.state = ConnectionStep.states.pristine;
    }

    reverse()
    {
        [this.computer1, this.computer2] = [this.computer2, this.computer1];
        return this;
    }

    toJSON()
    {
        return {
            computer1:this.computer1,
            computer2:this.computer2,
            state:this.state
        }
    }

    get tracePoint()
    {
        let ratio = 1 - (this.amountTraced / ConnectionStep.distance),
            loc1 = this.computer1.location,
            loc2 = this.computer2.location,
            x = loc1.x + (loc2.x - loc1.x) * ratio,
            y = loc1.y + (loc2.y - loc1.y) * ratio;
        return {x:x, y:y};
    }

    /**
     * This method increases the amount the connection step has been traced by
     * and returns the remaining amount that the reduction has left or null if the connection does not succeed
     * So if the ConnectionLength is 30, the amount traced is 10 and the current
     * trace amount is 25, this method will return 5.
     * If the ConnectionLength is 20, the amount traced is 5 and the current trace amount is 10
     * the return value will be -1
     * This allows us to check if the amount traced resulted in a successful trace as any value greater than
     * or equal to zero is a trace.
     * @param {number}  amount  The distance to trace
     * @returns {number}    The remaining distance after this step has been traced
     */
    traceAmount(amount) {
        if(this.state === ConnectionStep.states.traced)
        {
            return 0;
        }
        this.state = ConnectionStep.states.tracing;
        this.amountTraced += amount;
        this.traceTicks++;
        if(this.amountTraced >= ConnectionStep.distance)
        {
            let remainder = this.amountTraced - ConnectionStep.distance;
            this.state = ConnectionStep.states.traced;
            this.trigger(ConnectionStep.events.stepTraced);
            return remainder;
        }
        return -1;
    }

}
ConnectionStep.distance = 20;
ConnectionStep.states = {'pristine':'pristine','tracing':'tracing', 'traced':'traced'};
ConnectionStep.events = {'stepTraced':'stepTraced'};

/**
 * A class to encapsulate the points in between you and the target computer, excluding both
 */
class Connection extends EventListener
{
    constructor(name)
    {
        super();
        if(!name)
        {
            connections++;
        }
        /**
         * This is used for easy comparison between two connections
         * and will only be of import in later game because in early game the connections will be automated
         * @type {string}
         */
        this.hash = '';
        /**
         * * @type {MechanicalComputer}
         */
        this.startingPoint = null;
        /**
         * @type {MechanicalComputer}
         */
        this.endPoint = null;
        /**
         * A friendly descriptor for the computer
         * One is generated using the number of currently created connections if none is provided
         * @type {string}
         */
        this.name = name?name:`Connection ${connections}`;
        /**
         * The computers in the connection
         * @type {Array.<Computer>}
         */
        this.computers=[];
        /**
         * The steps in the connection
         * @type {Array.<ConnectionStep>}
         */
        this.steps = [];
        /**
         * The total length of the connection as an abstract number.
         * This is used as a ticker to let us know if the connection has been traced
         * @type {number}
         */
        this.connectionLength = 0;
        /**
         * The number of computers that have been sucessfully traced
         * @type {number}
         */
        this.stepsTraced = 0;
        /**
         * The number of ticks that we have been tracing.
         * @type {number}
         */
        this.traceTicks = 0;
        /**
         * A flag for tracking if this connection is active
         * @type {boolean}
         */
        this.active = false;
        /**
         * A flag for tracking if the connection has been traced
         * @type {boolean}
         */
        this.traced = false;
        /**
         * A state container so that we can initialise this.steps
         * @type {boolean}
         */
        this.initialised = false;
        /**
         * The step currently being traced
         * @type {null|ConnectionStep}
         */
        this.currentStep = null;
    }

    /**
     * A method to initialise the connection steps.
     */
    initialise()
    {
        /*
        Make sure this happens only once
         */
        if(this.initialised)
        {
            return;
        }
        // default the array
        this.steps = [];
        if(this.startingPoint && this.computers.length>=1)
        {
            this.steps.push(
                new ConnectionStep(this.startingPoint, this.computers[0])
                    .on(ConnectionStep.events.stepTraced, () => {
                        this.stepTraced();
                    })
            );
        }

        // loop through all of the computers and make connections out of them.
        for(let i = 1; i < this.computers.length; i++)
        {
            // the connection's first computer is either the last computer in the loop
            // or the starting computer
            this.steps.push(
                new ConnectionStep(this.computers[i - 1], this.computers[i])
                    .on(ConnectionStep.events.stepTraced, ()=>{
                        this.stepTraced();
                    })
            );
            // set the last computer in the loop to be this computer
        }
        if(this.endPoint) {
            // make the step for the end point
            // determine what the previous point is
            let startPoint = this.computers.length > 0 ? this.computers[this.computers.length - 1] : this.startingPoint;
            this.steps.push(
                new ConnectionStep(startPoint, this.endPoint)
                    .on(ConnectionStep.events.stepTraced, () => {
                        this.stepTraced();
                    })
            );
        }
        // set initialised to true
        this.initialised = true;
        this.steps = this.steps.reverse();
        this.currentStep = this.steps[0];
    }

    /**
     * A method to handle what happens when a step is traced
     * At present this triggers its own event in turn
     */
    stepTraced()
    {
        this.trigger("stepTraced", this.stepsTraced);
    }

    /**
     * A method to increase the abstract distance between computers in a Connection step
     * It just delegates it to the ConnectionStep
     * @param amount
     */
    static improveConnectionDistance(amount)
    {
        ConnectionStep.length += amount;
    }

    /**
     * Determine the total abstract distance of the connection
     * @deprecated
     * @see totalConnectionDistance
     * @returns {number}
     */
    get totalConnectionLength()
    {
        return this.totalConnectionDistance;
    }

    /**
     * This method returns the total distance this connection represents
     * Distance is an abstract number representing a measure of how long it should take to trace, not a number of meters
     * @returns {number}
     */
    get totalConnectionDistance()
    {
        return this.steps.length * ConnectionStep.distance;
    }

    /**
     * Set the starting computer of the connection. This is treated as separate from this.computers because the player computer or mission computer
     * may require separate behaviours and it is easier to accommodate that if they're separate
     * @param {MechanicalComputer} startingComputer
     * @returns {Connection}
     */
    setStartingPoint(startingComputer)
    {
        this.startingPoint = startingComputer;
        this.connectionLength ++;
        return this;
    }

    /**
     * Set the end computer of the connection. This is treated as separate from this.computers because the player computer or mission computer
     * may require separate behaviours and it is easier to accommodate that if they're separate
     * @param  {MechanicalComputer} endPointComputer
     * @returns {Connection}
     */
    setEndPoint(endPointComputer)
    {
        this.endPoint = endPointComputer;
        this.connectionLength ++;
        this.initialise();
        return this;
    }

    connect()
    {
        this.stepsTraced = 0;
        this.active = true;
        return this.connectComputers();
    }

    reconnect()
    {
        this.active = true;
        return this.connectComputers();
    }

    /**
     *
     * @returns {Connection}
     */
    connectComputers()
    {
        for(let computer of this.computers)
        {
            computer.connect();
        }
        return this;
    }

    /**
     * this is needed so that mission computers retain the state of the connection's tracedness
     */
    clone()
    {
        let clone = new Connection(this.name);
        clone.startingPoint = this.startingPoint;
        for(let computer of this.computers)
        {
            clone.addComputer(computer);
        }
        return clone;
    }

    /**
     * @param {Connection} otherConnection
     * @returns {boolean}
     */
    equals(otherConnection)
    {
        return (this.hash === otherConnection.hash);
    }

    /**
     * @param {number|null} stepTraceAmount the amount of the current step in the connection to trace by
     */
    traceStep(stepTraceAmount)
    {
        if(!this.initialised)
        {
            this.initialise();
        }
        if(this.traced)
        {
            return;
        }

        this.traceTicks++;
        if(this.traceTicks % Connection.sensitivity === 0)
        {
            this.trigger('updateTracePercentage', this.tracePercent);
        }

        let remainder = null;
        do
        {
            remainder = this.currentStep.traceAmount(stepTraceAmount);
            if(remainder >= 0)
            {
                this.stepsTraced ++;
                this.currentStep = this.steps[this.stepsTraced < this.steps.length?this.stepsTraced:this.steps.length - 1];
            }


            if(this.stepsTraced === this.steps.length)
            {
                this.traced = true;
                this.trigger('connectionTraced');
            }
        }while(remainder > 0 || this.stepsTraced >= this.steps.length && this.traced === false);
    }

    get totalAmountTraced()
    {
        return (this.stepsTraced * ConnectionStep.distance) + this.currentStep.amountTraced;
    }

    close()
    {
        let reverseComputers = this.computers.reverse();
        for(let computer of reverseComputers)
        {
            computer.disconnect();
        }
        this.active = false;
        return this;
    }

    addComputer(computer)
    {
        if(!(computer instanceof Computer))
        {
            throw new InvalidTypeError("Incorrect object type added");
        }
        if(this.computers.indexOf(computer) >= 0)
        {
            this.removeComputer(computer);
            return this;
        }
        this.computers.push(computer);
        this.connectionLength ++;
        this.buildHash();
        return this;
    }

    get tracePercent()
    {
        return Math.min(100, (this.totalAmountTraced / this.totalConnectionLength * 100).toFixed(2));
    }

    removeComputer(computer)
    {
        if(this.computers.indexOf(computer) < 0)
        {
            throw new InvalidComputerError("Computers not found in connection");
        }
        this.buildHash();
        helpers.removeArrayElement(this.computers, computer);
        this.connectionLength --;
    }

    buildHash()
    {
        let strToHash = '';
        for(let computer of this.computers)
        {
            strToHash += computer.simpleHash;
        }
        this.hash = md5(strToHash);
    }

    toJSON()
    {
        let json= {name:this.name, ipAddresses:[]};
        for(let computer of this.computers)
        {
            json.ipAddresses.push(computer.ipAddress);
        }
        return json;
    }

    static fromJSON(json, startingPoint)
    {
        let connection = new Connection(json.name);
        connection.startingPoint = startingPoint;
        for(let ipAddress of json.ipAddresses)
        {
            connection.addComputer(PublicComputer.getPublicComputerByIPAddress(ipAddress));
        }
        return connection;
    }

    static fromAllPublicServers()
    {
        return this.fromComputerArray(
            helpers.shuffleArray(
                Object.values(PublicComputer.getAllKnownPublicServers())
            )
        );
    }

    static fromComputerArray(computerArray)
    {
        let connection = new Connection();
        for(let computer of computerArray)
        {
            connection.addComputer(computer);
        }
        return connection;
    }

    reverse()
    {
        this.steps.reverse();
        [this.startingPoint, this.endPoint] = [this.endPoint, this.startingPoint];
        return this;
    }
}

Connection.connectionDistance = 50;
Connection.sensitivity = 10;

module.exports = Connection;

},{"./Computers/Computer":11,"./Computers/PublicComputer":15,"./EventListener":25,"./Helpers":27,"md5":5}],24:[function(require,module,exports){
const   MissionGenerator = require('./Missions/MissionGenerator'),
        EventListener = require('./EventListener'),
        Connection = require('./Connection'),
        Company = require('./Companies/Company'),
        ComputerGenerator = require('./Computers/ComputerGenerator'),
        CPU = require('./Computers/CPU'),
        helper = require('./Helpers'),
        Research = require('./Computers/Research/Research'),
        Decimal = require('break_infinity.js');

/**
 * This class serves to expose, to the front end, any of the game classes functionality that the UI needs access to
 * It exists only as a means of hard encapsulation
 * This exists as an instantiable class only because it's really difficult to get static classes to have events
 */
class Downlink extends EventListener
{
    constructor()
    {
        super();
        /**
         * @type {PlayerComputer}
         */
        this.playerComputer = null;
        /**
         *
         * @type {Connection}
         */
        this.playerConnection = null;
        this.runTime = 0;
        this.lastTickTime = Date.now();
        this.missionData = {
            taken:0,
            failed:0,
            succeeded:0
        };
        this.autoPurchaseCPUs = false;
        /**
         * @type {Decimal}
         */
        this.currency = new Decimal(0);
    }

    setPlayerComputer(location)
    {
        this.playerComputer = ComputerGenerator.newPlayerComputer(location);
        return this.playerComputer;
    }

    getPlayerComputer(location)
    {
        if(!this.playerComputer)
        {
            this.setPlayerComputer(location);
        }
        this.playerComputer.once('cpuPoolEmpty', ()=>{
            this.trigger('cpuPoolEmpty');
        }).on('cpuBurnedOut', (slot, cpu)=>{
            if(this.autoPurchaseCPUs)
            {
                this.autoBuyCPU(cpu, slot);
            }
        });
        return this.playerComputer;
    }

    tick()
    {
        let now = Date.now();
        this.runTime += now - this.lastTickTime;

        let tasks = this.playerComputer.tick();
        if(this.activeMission)
        {
            this.activeMission.tick();
        }
        this.lastTickTime = Date.now();
        return {
            tasks:tasks
        }
    }

    getNextMission()
    {
        if(this.playerComputer.cpuPool.cpuCount === 0)
        {
            return null;
        }
        this.missionData.taken ++;
        this.activeMission = MissionGenerator.getFirstAvailableMission()
            .on("complete", ()=>{
                this.finishCurrentMission(this.activeMission);
                this.activeMission = null;
                this.missionData.succeeded++;
                this.trigger('missionComplete');
            })
            .on("hackTracked", ()=>{
                this.missionData.failed++;
                this.playerComputer.clearMissionTasks();
            });
        this.activeMission.computer.connect(this.playerConnection);
        for(let challenge of this.activeMission.challenges)
        {
            challenge.on("solved", ()=>{this.challengeSolved(challenge)});
            this.playerComputer.addTaskForChallenge(challenge);
        }
        return this.activeMission;
    }

    disconnectFromMissionServer()
    {
        if(this.activeMission)
        {
            this.activeMission.computer.disconnect();
            for (let task of this.playerComputer.missionTasks)
            {
                task.pause();
            }
        }
    }

    reconnectToMissionServer()
    {
        this.activeMission.computer.reconnect(this.playerConnection);
        for(let task of this.playerComputer.missionTasks)
        {
            task.resume();
        }
    }

    finishCurrentMission(mission)
    {
        this.currency = this.currency.add(mission.reward);
    }

    challengeSolved(challenge)
    {
        this.trigger("challengeSolved", challenge);
    }

    /**
     * Just exposing the currently available missions
     */
    get availableMissions()
    {
        return MissionGenerator.availableMissions;
    }

    get currentMissionTasks()
    {
        return this.playerComputer.missionTasks;
    }

    get allPublicServers()
    {
        let servers = [];
        for(let company of Company.allCompanies)
        {
            servers.push(company.publicServer);
        }
        return servers;
    }

    /**
     *
     * @returns {[<Company>]}
     */
    get companies()
    {
        return Company.allCompanies;
    }

    performPostLoad(canvas)
    {
        this.buildComputerGenerator(canvas);
        let allValidPoints = [...require('./validWorldMapPoints')];
        this.getPlayerComputer(helper.popRandomArrayElement(allValidPoints));
        this.autoBuildConnection();
        Company.setAllPublicServerLocations(allValidPoints);
    }

    buildComputerGenerator(imageReference)
    {
        ComputerGenerator.defineMapImage(imageReference);
    }

    /**
     * @param {Computer} computer
     * @returns {Connection}
     */
    addComputerToConnection(computer)
    {
        return this.playerConnection.addComputer(computer);
    }

    autoBuildConnection()
    {
        this.playerConnection = Connection.fromAllPublicServers();
        this.playerConnection.setStartingPoint(this.playerComputer).initialise();
        return this.playerConnection;
    }

    get currentConnection()
    {
        if(this.activeMission)
        {
            return this.activeMission.connection;
        }
        else
        {
            return this.playerConnection;
        }
    }

    toJSON()
    {
        let json = {
            playerComputer:this.playerComputer.toJSON(),
            playerConnection:this.playerConnection.toJSON(),
            companies:[],
            currency:this.currency.toString(),
            runTime:this.runTime,
            researches:Research.categoryResearches,
            missionData:this.missionData,
            autoPurchaseCPUs:this.autoPurchaseCPUs
        };
        for(let company of this.companies)
        {
            json.companies.push(company.toJSON());
        }
        return json;
    }

    static fromJSON(json)
    {
        Company.loadCompaniesFromJSON(json.companies);
        Research.loadJSON(json.researches);

        let downlink = new Downlink();

        downlink.currency = Decimal.fromString(json.currency);
        downlink.playerComputer = ComputerGenerator.fromJSON(json.playerComputer);
        downlink.runTime = parseInt(json.runTime);
        downlink.lastTickTime = Date.now();
        downlink.missionData = json.missionData;
        downlink.autoPurchaseCPUs = json.autoPurchaseCPUs;


        downlink.playerConnection = Connection.fromJSON(json.playerConnection);
        downlink.playerConnection.setStartingPoint(downlink.playerComputer);

        return downlink;
    }

    static getNew()
    {
        Company.buildCompanyList();
        Research.loadDefaultJSON();
        let dl = new Downlink();
        return dl;
    }

    static stop()
    {

    }

    getTaskByHash(hash)
    {
        for(let task of this.playerComputer.cpuPool.tasks)
        {
            if(task.hash === hash)
            {
                return task;
            }
        }
    }

    get secondsRunning()
    {
        return Math.floor(this.runTime / 1000);
    }

    canAfford(cost)
    {
        return this.currency.greaterThan(cost);
    }

    autoBuyCPU(cpuData, slot)
    {
        let cpu = CPU.getCPUByName(cpuData.name);
        this.currency = this.currency.minus(CPU.getPriceFor(cpuData) * 1.5);
        this.playerComputer
            .setCPUSlot(slot, cpu)
            .updateLoadBalance();
        this.trigger('cpusAutoReplaced');
    }

    buyCPU(cpuData, slot)
    {
        let cpu = CPU.fromJSON(cpuData);
        this.currency = this.currency.minus(CPU.getPriceFor(cpuData));
        this.playerComputer
            .setCPUSlot(slot, cpu)
            .updateLoadBalance();
    }

    alterCPULoad(taskHash, direction)
    {
        return this.playerComputer.alterCPULoad(taskHash, direction);
    }

    get cpuIncreaseCost()
    {
        return this.playerComputer.cpuPool.maxCPUs * 1000
    }

    buyMaxCPUIncrease()
    {
        this.currency = this.currency.minus(this.cpuIncreaseCost);
        this.playerComputer.increaseCPUPoolSize();
    }

    get availableResearch()
    {
        return Research.availableResearch;
    }

    startResearch(researchItemName)
    {
        let researchItem = Research.getItemByName(researchItemName);
        researchItem.on('complete', ()=>{
            this.playerComputer.updateCPUPool();
            this.trigger('researchComplete');
        });

        this.playerComputer.startResearchTask(researchItem);
    }

    get currentCPUTasks()
    {
        return this.playerComputer.currentCPUTasks;
    }

    setCPUAutoPurchase(autoPurchase)
    {
        this.autoPurchaseCPUs = autoPurchase;
    }

}

module.exports = Downlink;

},{"./Companies/Company":7,"./Computers/CPU":9,"./Computers/ComputerGenerator":12,"./Computers/Research/Research":16,"./Connection":23,"./EventListener":25,"./Helpers":27,"./Missions/MissionGenerator":34,"./validWorldMapPoints":36,"break_infinity.js":1}],25:[function(require,module,exports){
class Event
{
    constructor(owner, name, once)
    {
        this.owner = owner;
        this.name = name;
        this.once = once;
        this.triggered = false;
        this.callbacks = [];
    }

    addListener(callback)
    {
        this.callbacks.push(callback);
        return this;
    }

    removeListener(callback)
    {
        let index = this.callbacks.indexOf(callback);
        if(index >= 0)
        {
            this.callbacks.splice(index, 1);
        }
        return this;
    }

    trigger(args)
    {
        if(!this.once || (this.once && !this.triggered))
        {
            this.callbacks.forEach(function (callback) {
                callback(...args);
            });
        }
        this.triggered = true;
    }
}

class EventListener
{
    constructor()
    {
        /**
         * @type {{Event}}
         */
        this.events = {};
    }

    static set staticEvents(events)
    {
        this._events = events;
    }

    static get staticEvents()
    {
        if(!this.hasOwnProperty('_events'))
        {
            this._events = {};
        }
        return this._events;
    }

    once(eventName, callback)
    {
        let e = eventName.toLowerCase();
        if(!this.events[e])
        {
            this.events[e] = new Event(this, e, true);
        }
        this.events[e].triggered = false;
        this.events[e].addListener(callback);
        return this;
    }

    static once(eventName, callback)
    {
        let e = eventName.toLowerCase();
        if(!this.staticEvents[e])
        {
            this.staticEvents[e] = new Event(this, e, true);
        }
        this.staticEvents[e].triggered = false;
        this.staticEvents[e].addListener(callback);
        return this;
    }

    on(eventName, callback)
    {
        let e = eventName.toLowerCase();
        if(!this.events[e])
        {
            this.events[e] = new Event(this, e);
        }
        this.events[e].addListener(callback);
        return this;
    }

    static on(eventName, callback)
    {
        let e = eventName.toLowerCase();
        if(!this.staticEvents[e])
        {
            this.staticEvents[e] = new Event(this, e);
        }
        this.staticEvents[e].addListener(callback);
        return this;
    }

    off(eventName)
    {
        if(eventName)
        {
            let e = eventName.toLowerCase();
            delete(this.events[e]);
        }
        else
        {
            this.events = {};
        }
        return this;
    }

    static off(eventName)
    {
        if(eventName)
        {
            let e = eventName.toLowerCase();
            delete(this.staticEvents[e]);
        }
        else
        {
            this.staticEvents = {};
        }
    }

    addListener(eventName, callback)
    {
        let e = eventName.toLowerCase();
        return this.on(e, callback);
    }


    trigger(eventName, ...args)
    {
        let e = eventName.toLowerCase();
        if(this.events[e])
        {
            try
            {
                let evt = this.events[e];
                evt.trigger(args);
            }
            catch(e)
            {
                console.log(e);
            }
        }
    }

    static trigger(eventName, ...args)
    {
        let e = eventName.toLowerCase();
        if(this.staticEvents[e])
        {
            try
            {
                let evt = this.staticEvents[e];
                evt.trigger(args);
            }
            catch(e)
            {
                console.log(e);
            }
        }
    }

    static removeListener(eventName, callback)
    {
        let e = eventName.toLowerCase();
        if(this.staticEvents[e])
        {
            this.staticEvents[e].removeListener(callback);
        }
    }

    removeListener(eventName, callback)
    {
        let e = eventName.toLowerCase();
        if(this.events[e])
        {
            this.events[e].removeListener(callback);
        }
    }
}

module.exports = EventListener;

},{}],26:[function(require,module,exports){
// This file is solely responsible for exposing the necessary parts of the game to the UI elements
(($)=>{$(()=>{
    const   Downlink = require('./Downlink'),
            CPU = require('./Computers/CPU'),
            EncryptionCracker = require('./Computers/Tasks/EncryptionCracker'),
            {PasswordCracker} = require('./Computers/Tasks/PasswordCracker'),
            Decimal = require('break_infinity.js'),
            TICK_INTERVAL_LENGTH=100,
            MISSION_LIST_CLASS = 'mission-list-row',
            COMPANY_REP_CLASS = 'company-rep-row',
            COMPANY_SECURITY_CLASS = 'company-security-col',
            COMPANY_REP_VALUE_CLASS = 'company-rep-col',
            CPU_MISSION_TASK = 'cpu-mission-task',
            PLAYER_COMPUTER_CPU_ROW_CLASS = "cpu-row";

    function parseVersionNumber(versionNumberAsString)
    {
        let parts = versionNumberAsString.split('.'),
            partAsNumber = 0;
        for(let partIndex in parts)
        {
            let exponent = parts.length - 1 - partIndex,
                part = parseInt(parts[partIndex], 10),
                multiple = Math.pow(1000, exponent);
            partAsNumber +=  (part * multiple);
        }
        return partAsNumber
    }

    let game = {
        interval:null,
        ticking:true,
        initialised:false,
        takingMissions:false,
        mission:false,
        computer:null,
        downlink:null,
        version:"0.5.7b",
        requiresHardReset:true,
        canTakeMissions:true,
        requiresNewMission:true,
        minimumVersion:"0.5.5b",
        /**
         * jquery entities that are needed for updating
         */
        $missionContainer:null,
        $activeMissionName:null,
        $activeMissionPassword:null,
        $activeMissionEncryptionGrid:null,
        $activeMissionEncryptionType:null,
        $activeMissionIPAddress:null,
        $activeMissionServerName:null,
        $playerCurrencySpan:null,
        $playerStandingsTitle:null,
        $playerStandingsContainer:null,
        $playerComputerPartsTitle:null,
        $worldMapModal:null,
        $worldMapContainer:null,
        $worldMapCanvasContainer:null,
        $activeMissionServer:null,
        $settingsTimePlayed:null,
        $settingsMissionsTaken:null,
        $settingsMissionsSucceeded:null,
        $settingsMissionsFailed:null,
        $settingsModal:null,
        $importExportTextarea:null,
        $computerBuildModal:null,
        $computerBuild:null,
        $computerPartsCPURow:null,
        $connectionLength:null,
        $connectionTraced:null,
        $connectionWarningRow:null,
        $missionToggleButton:null,
        $connectionTracePercentage:null,
        $connectionTraceBar:null,
        $encryptionCells:null,
        $activeMissionTraceStrength:null,
        $activeMissionDisconnectButton:null,
        $cpuTasksCol:null,
        $gridSizeIncreaseSpan:null,
        $gridSizeCostSpan:null,
        $gridSizeButton:null,
        $researchModal:null,
        $researchModalBody:null,
        $settingsAutoPurchaseCPUs:null,
        /**
         * HTML DOM elements, as opposed to jQuery entities for special cases
         */
        mapImageElement:null,
        miniMapCanvas:null,
        bindUIElements:function()
        {
            this.$missionContainer = $('#mission-list');
            this.$activeMissionName = $('#active-mission');
            this.$activeMissionServer = $('#active-mission-machine-details');
            this.$activeMissionPassword = $('#active-mission-password-input');
            this.$activeMissionEncryptionGrid = $('#active-mission-encryption-grid');
            this.$activeMissionEncryptionType = $('#active-mission-encryption-type');
            this.$activeMissionIPAddress = $('#active-mission-server-ip-address');
            this.$activeMissionServerName = $('#active-mission-server-name');
            this.$playerCurrencySpan = $('#player-currency');
            this.$playerStandingsTitle = $('#player-company-standings-title');
            this.$playerStandingsContainer = $('#player-company-standings');
            this.$playerComputerPartsTitle = $('#player-computer-processors-title');
            this.$worldMapModal = $('#connection-modal');
            this.$worldMapContainer = $('#world-map');
            this.$worldMapCanvasContainer = $('#canvas-container');
            this.$worldMapModal.on("hide.bs.modal", ()=>{this.afterHideConnectionManager()});
            this.$settingsTimePlayed = $('#settings-time-played');
            this.$settingsMissionsFailed = $("#settings-missions-failed");
            this.$settingsMissionsSucceeded = $("#settings-missions-succceeded");
            this.$settingsMissionsTaken = $('#settings-mission-taken');
            this.$settingsModal = $('#settings-modal');
            this.$importExportTextarea = $('#settings-import-export');
            this.$computerBuildModal = $('#computer-build-modal');
            this.$computerBuild = $('#computer-build-layout');
            this.$computerPartsCPURow = $('#computer-parts-cpu-row');
            this.$connectionLength = $('#connection-length');
            this.$connectionTraced = $('#connection-traced');
            this.$connectionTracePercentage = $('#connection-trace-percentage');
            this.$connectionTraceBar = $('#connection-trace-bar');
            this.$connectionWarningRow = $('#connection-warning-row');
            this.$activeMissionTraceStrength = $('#active-mission-trace-strength');
            this.$cpuTasksCol = $('#tasks-col');
            this.$gridSizeIncreaseSpan = $('#grid-size-increase-amount');
            this.$gridSizeCostSpan = $('#grid-size-increase-cost');
            this.$researchModal = $('#research-modal');
            this.$researchModalBody = $('#research-modal-body');
            this.$settingsAutoPurchaseCPUs = $('#settings-autoreplace-cpus').on('change', (evt)=>{
                this.downlink.setCPUAutoPurchase($(evt.target).prop('checked'));
            });

            this.$gridSizeButton = $('#increase-cpu-grid-size').click(()=>{this.increaseCPUPoolSize()});
            this.$activeMissionDisconnectButton = $('#disconnect-button').click(()=>{this.disconnect()});
            this.$missionToggleButton = $('#missions-toggle-button').click(()=>{this.toggleMissions();});

            $('#settings-export-button').click(()=>{this.$importExportTextarea.val(this.save());});
            $('#settings-import-button').click(()=>{this.importFile(this.$importExportTextarea.val())});
            $('#settings-save-button').click(()=>{this.saveFile();});
            $('#connectionModalLink').click(()=>{this.showConnectionManager();});
            $('#settingsModalLink').click(()=>{this.showSettingsModal();});
            $('#researchModalLink').click(()=>{this.showResearchModal();});
            $('#game-version').html(this.version);
            $('#computerModalLink').click(()=>{this.showComputerBuildModal()});
            $('#connection-auto-build-button').click(()=>{this.autoBuildConnection()});

            this.miniMapCanvas = document.getElementById('mini-world-map');
        },
        toggleMissions:function()
        {
            this.takingMissions = !this.takingMissions;
            if(this.takingMissions)
            {
                this.$missionToggleButton.text("Stop Taking Missions");
                this.$activeMissionDisconnectButton.removeAttr('disabled');
            }
            else
            {
                this.$missionToggleButton.text("Start Taking Missions");
            }
        },
        buildWorldMap:function()
        {
            let image = new Image();
            this.mapImageElement = image;
            /*
             This is needed so that we can know what the image values are before the game loads
             */
            return new Promise((resolve)=>{

                image.onload =()=>{
                    this.buildCanvas();
                    resolve();
                };
                image.src = './img/osm-world-map.png';
            });
        },
        getFreshCanvas()
        {
            let canvas = document.createElement('canvas');
            canvas.width = this.mapImageElement.width;
            canvas.height = this.mapImageElement.height;
            canvas
                .getContext('2d')
                .drawImage(
                    this.mapImageElement, 0, 0,
                    this.mapImageElement.width, this.mapImageElement.height
                );

            this.$worldMapCanvasContainer.html(canvas);
            return canvas;
        },
        /**
         * Using a canvas for two reasons. JavaScript requires one to figure out whether a random point is landbound or not
         * This will pass a fresh copy of the canvas to the Downlink object to keep for that purpose and also draw
         * one to the dom. The one on the dom will be drawn to and deleted and drawn to and deleted, but the
         * Downlink object needs to know the raw one.
         */
        buildCanvas:function()
        {
            this.downlink.performPostLoad(this.getFreshCanvas());

            this.$worldMapContainer.css({
                height:this.mapImageElement.height+'px',
                width:this.mapImageElement.width+'px'
            });
        },
        autoBuildConnection:function()
        {
            this.downlink.autoBuildConnection();
            this.updateConnectionMap();
        },
        newGame:function()
        {
            this.downlink = Downlink.getNew();
        },
        loadGame:function(json)
        {
            this.downlink = Downlink.fromJSON(json);
        },
        saveFile:function()
        {
            let data = new Blob([this.save()], {type: 'text/plain'}),
                a = document.createElement('a');
            a.href = window.URL.createObjectURL(data);
            a.download = 'Downlink-Save.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        },
        importFile:function(json)
        {
            this.stop();
            this.initialised = false;
            this.loadGame(json);
            this.performPostLoadCleanup().then(()=>{
                this.start();
            });
        },
        needsHardReset:function(saveFile)
        {
            if(!saveFile.version)
            {
                return true;
            }
            let oldVersionAsInt = parseVersionNumber(saveFile.version),
                minVersionAsInt = parseVersionNumber(this.minimumVersion);
            return (oldVersionAsInt < minVersionAsInt);
        },
        initialise:function()
        {
            this.bindUIElements();

            let saveFile = this.load();
            if (saveFile && !this.needsHardReset(saveFile))
            {
                this.loadGame(saveFile);
            }
            else
            {
                this.newGame();
            }
            this.downlink.on('cpusAutoReplaced', ()=>{
                this.updateComputerBuild();
                this.buildComputerPartsUI();
                this.buildComputerGrid();
            });

            return this.performPostLoadCleanup();
        },
        performPostLoadCleanup:function()
        {
            this.updatePlayerDetails();
            this.updateMissionData();
            this.initialised = true;
            return this.buildWorldMap().then(()=>{
                let pc = this.downlink.playerComputer;
                pc.on('cpuBurnedOut', ()=>{this.buildComputerGrid();});
                pc.on('cpuPoolEmpty', ()=>{this.handleEmptyCPUPool();});
                pc.on('cpusAutoReplaced', ()=>{});
                this.addComputerToWorldMap(pc);
                this.updateComputerBuild();
                this.buildComputerPartsUI();
                this.buildComputerGrid();
                this.buildCompanyStateTable();

                this.canTakeMissions = pc.cpuPool.cpuCount > 0;
                this.updateMissionToggleButton();

                this.addPublicComputersToWorldMap();
                this.$connectionLength.html(this.downlink.playerConnection.connectionLength);
                this.showOrHideConnectionWarning();

                this.ticking = true;
                this.updateConnectionMap();
                this.save();
            });
        },
        addPublicComputersToWorldMap:function()
        {
            for(let computer of this.downlink.allPublicServers)
            {
                this.addComputerToWorldMap(computer, ()=>{
                    this.addComputerToConnection(computer);
                });
            }
        },
        addComputerToConnection:function(computer)
        {
            this.downlink.addComputerToConnection(computer);
            this.updateConnectionMap();
        },
        updateConnectionMap:function()
        {
            let connection = this.downlink.currentConnection,
                context = this.getFreshCanvas().getContext('2d'),
                mmContext = this.miniMapCanvas.getContext('2d'),
                ratio = this.miniMapCanvas.width / context.canvas.width;
            this.miniMapCanvas.height = context.canvas.height * ratio;
            mmContext.drawImage(context.canvas, 0, 0, this.miniMapCanvas.width, this.miniMapCanvas.height);
            mmContext.lineWidth = 0.4;

            for(let step of connection.steps)
            {
                let colors = {
                        'pristine':'#000',
                        'traced':'#f00'
                    };
                if(step.state === 'tracing')
                {
                    this.drawPartiallyTracedStep(step, context, mmContext, ratio, colors.pristine, colors.traced);
                }
                else
                {
                    this.drawSimpleStep(step, context, mmContext, ratio, colors[step.state]);
                }
            }
            // place the image in the mini map

        },
        drawLineOnContext:function(context, position1, position2, color, ratio)
        {
            ratio = ratio?ratio:1;
            context.beginPath();
            context.strokeStyle = color;
            context.moveTo(position1.x * ratio, position1.y * ratio);
            context.lineTo(position2.x * ratio, position2.y * ratio);
            context.stroke();
        },
        drawPartiallyTracedStep:function(step, context, mmContext, ratio, tracedLineColor, untracedLineColor)
        {
            let loc1 = step.computer1.location,
                loc2 = step.tracePoint,
                loc3 = step.computer2.location;
            this.drawLineOnContext(context, loc1, loc2, tracedLineColor);
            this.drawLineOnContext(context, loc2, loc3, untracedLineColor);
            this.drawLineOnContext(mmContext, loc1, loc2, tracedLineColor, ratio);
            this.drawLineOnContext(mmContext, loc2, loc3, untracedLineColor, ratio);

        },
        drawSimpleStep:function(step, context, mmContext, ratio, lineColor)
        {
            let loc1 = step.computer1.location,
                loc2 = step.computer2.location;

                // connect the current computer to the current computer in the connection
            this.drawLineOnContext(context, loc1, loc2, lineColor);
            this.drawLineOnContext(mmContext, loc1, loc2, lineColor, ratio);
        },
        start:function(){
            this.ticking = true;
            if(this.initialised)
            {
                this.tick();
            }
            else
            {
                this.initialise().then(() => {
                    this.tick();
                });
            }
            return this;
        },
        stop:function(){
            this.ticking = false;
            window.clearTimeout(this.interval);
            return this;
        },
        "restart":function()
        {
            this.stop().start();
        },
        tick:function() {
            if (this.ticking)
            {
                let tickResults = this.downlink.tick();
                this.animateTasks(tickResults.tasks);
                this.$settingsTimePlayed.html(this.getRunTime());
                if (this.takingMissions && this.requiresNewMission)
                {
                    this.getNextMission();
                }
                this.interval = window.setTimeout(() => {this.tick()}, TICK_INTERVAL_LENGTH);
            }
        },
        animateTasks:function(tasks)
        {
            if(tasks.length)
            {
                for(let task of tasks)
                {
                    if(task instanceof EncryptionCracker)
                    {
                        this.animateEncryptionGrid(task);
                    }
                    else if(task instanceof PasswordCracker)
                    {
                        this.animatePasswordField(task);
                    }
                }
            }
        },
        "setTraceStrength":function(traceStrength)
        {
            this.$activeMissionTraceStrength.text(traceStrength);
        },
        /**
         *
         * @param {PasswordCracker|undefined|null} passwordCracker
         */
        animatePasswordField:function(passwordCracker)
        {
            if(passwordCracker)
            {
                this.$activeMissionPassword
                    .val(passwordCracker.currentGuess)
                    .removeClass("solved-password unsolved-password")
                    .addClass(passwordCracker.completed ? "solved-password" : "unsolved-password");
            }
            else
            {
                this.$activeMissionPassword
                    .removeClass("unsolved-password")
                    .addClass('solved-password');
            }
        },
        updateEncryptionGridUI(numberOfCells, numberOfCols)
        {
            this.$activeMissionEncryptionGrid.css({
                'grid-template-columns':`repeat(${numberOfCols}, 1fr)`,
                "width":numberOfCols * 30+"px"
            });
            const   numberOfExtantCells = this.$activeMissionEncryptionGrid.children().length,
                    diff = numberOfCells - numberOfExtantCells;

            if(diff > 0)
            {
                // we need to add new cells
                let htmlToAppend = '';
                for (let i = 0; i < diff; i++)
                {
                    htmlToAppend += '<div class="encryption-cell unsolved-encryption-cell">*</div>';
                }

                this.$activeMissionEncryptionGrid.append($(htmlToAppend));
            }
            else if(diff < 0)
            {
                // we need to remove cells
                let cellsToRemove = Math.abs(diff);
                $(`.encryption-cell:nth-last-child(-n+${cellsToRemove})`).remove();
            }
            $('.encryption-cell').removeClass('solved-encryption-cell').addClass('unsolved-encryption-cell');
            this.$encryptionCells = document.querySelectorAll('.encryption-cell');
        },
        /**
         *
         * @param {EncryptionCracker} encryptionCracker
         */
        animateEncryptionGrid:function(encryptionCracker)
        {
            let cells = encryptionCracker.cellsForAnimating;
            for(let i = 0; i < cells.length; i++)
            {
                let cell = cells[i];
                let elem = this.$encryptionCells[i];
                let classes = elem.classList;
                if(cell.solved && classes.contains('unsolved-encryption-cell'))
                {
                    classes.remove('unsolved-encryption-cell');
                    classes.add('solved-encryption-cell');
                }
                if(elem.childNodes[0].nodeValue !== cell.letter)
                {
                    elem.childNodes[0].nodeValue = cell.letter;
                }
            }
        },
        disconnect:function()
        {
            if(this.mission && this.mission.computer.currentPlayerConnection.active)
            {
                this.downlink.disconnectFromMissionServer();
                this.$activeMissionDisconnectButton
                    .text('Reconnect')
                    .removeClass('btn-danger')
                    .addClass('btn-primary');
            }
            else
            {
                this.downlink.reconnectToMissionServer();
                this.$activeMissionDisconnectButton
                    .text('Disconnect')
                    .removeClass('btn-primary')
                    .addClass('btn-danger');

            }
        },
        updateMissionData:function()
        {
            this.$settingsMissionsTaken.text(this.downlink.missionData.taken);
            this.$settingsMissionsSucceeded.text(this.downlink.missionData.succeeded);
            this.$settingsMissionsFailed.text(this.downlink.missionData.failed);
        },
        getNextMission:function(){
            if(!this.takingMissions)
            {
                return false;
            }
            this.$activeMissionServer.show();
            this.$connectionTraced.html(0);
            this.$connectionTracePercentage.html(0);
            $('.MissionComputer').remove();

            this.mission = this.downlink.getNextMission();
            this.$activeMissionTraceStrength.text(this.mission.computer.traceSpeed.toFixed(2));
            this.updateMissionInterface(this.mission);
            this.requiresNewMission = false;
            this.updateConnectionMap();
            this.addComputerToWorldMap(this.mission.computer);
            this.updateMissionData();

            this.downlink
                .on("challengeSolved", (task)=>{this.updateChallenge(task)});
            // bind the mission events to the UI updates
            this.mission.on('complete', ()=>{
                this.updatePlayerDetails();
                this.updateComputerPartsUI();
                this.updateCompanyStates([this.mission.sponsor, this.mission.target]);
                this.requiresNewMission = true;
                this.$connectionTracePercentage.html(0);
                this.$connectionTraceBar.css('width', '0%');
                this.updateMissionData();
                this.save();
            }).on('hackTracked',()=>{
                this.updatePlayerDetails();
                this.updateComputerPartsUI();
                this.updateCompanyStates([this.mission.sponsor, this.mission.target]);
                this.requiresNewMission = true;
                this.$connectionTracePercentage.html(100);
                this.$connectionTraceBar.css('width', '100%');
                this.updateMissionData();
                this.mission.off();
            }).on("connectionStepTraced", (stepsTraced)=>{
                this.$connectionTraced.html(stepsTraced);
                this.updateConnectionMap();
            }).on("updateTracePercentage", (percentageTraced)=>{
                this.$connectionTracePercentage.html(percentageTraced);
                this.$connectionTraceBar.css('width', percentageTraced+'%');
                this.updateConnectionMap();
            });

        },
        updatePlayerDetails:function()
        {
            this.$playerCurrencySpan.html(this.downlink.currency.toFixed(2));
        },
        updateCompanyStates:function(companiesToUpdate)
        {
            for(let company of companiesToUpdate)
            {
                let $row = $(`.${COMPANY_REP_CLASS}[data-company-name="${company.name}"]`);
                $(`.${COMPANY_REP_VALUE_CLASS}`, $row).text(company.playerRespectModifier.toFixed(2));
                $(`.${COMPANY_SECURITY_CLASS}`, $row).text(company.securityLevel.toFixed(2));
            }
        },
        buildCompanyStateTable:function()
        {
            $(`.${COMPANY_REP_CLASS}`).remove();
            let html = '';
            for(let company of this.downlink.companies)
            {
                html += `<div class="row ${COMPANY_REP_CLASS}" data-company-name="${company.name}">
                    <div class="col">${company.name}</div>
                    <div class="col-2 ${COMPANY_REP_VALUE_CLASS}">${company.playerRespectModifier.toFixed(2)}</div>
                    <div class="col-2 ${COMPANY_SECURITY_CLASS}">${company.securityLevel.toFixed(2)}</div>
                </div>`;
            }
            this.$playerStandingsContainer.html(html);
        },
        updateComputerBuild:function()
        {
            $(`.${PLAYER_COMPUTER_CPU_ROW_CLASS}`).remove();
            let $lastRow = this.$playerComputerPartsTitle;
            for(let cpu of this.downlink.playerComputer.cpus)
            {
                if(cpu)
                {
                    let $row = $(`<div class="row ${PLAYER_COMPUTER_CPU_ROW_CLASS}">
                        <div class="col">${cpu.name}</div>
                        <div class="col-3">${cpu.speed}MHz</div>
                        <div class="col-2 cpu-remaining-cycle">${cpu.remainingLifeCycle}</div>
                    </div>`).insertAfter($lastRow);
                    cpu.on('lifeCycleUpdated', ()=>{
                        $('.cpu-remaining-cycle', $row).html(cpu.health?cpu.health:"Dead");
                    });
                    $lastRow = $row;
                }
            }
        },
        updateChallenge:function(challenge)
        {
            switch(challenge.constructor.name)
            {
                case "Password":
                    this.animatePasswordField(null);
                    break;
                case "EncryptionGrid":
                    break;
                default:
                    break;
            }
        },
        /**
         *
         * @param {Mission} mission
         */
        updateMissionInterface:function(mission){
            this.updateAvailableMissionList(mission);
            this.updateCurrentMissionView(mission.computer);
        },
        updateCPULoadBalancer:function()
        {
            $(`.${CPU_MISSION_TASK}`).remove();
            let html = '';
            for(let task of this.downlink.currentCPUTasks)
            {
                html += `<div class="row ${CPU_MISSION_TASK}" data-task-hash ="${task.hash}">`+
                    `<div class="col-5 cpu-task-name">${task.name}</div>`+
                    `<div class="col cpu-task-bar">`+
                        `<div class="reduce-cpu-load cpu-load-changer" data-cpu-load-direction="-1">&lt;</div>`+
                        `<div class="percentage-bar-container">`+
                            `<div class="percentage-bar" style="width:${task.loadPercentage}%" data-task-hash ="${task.hash}">&nbsp;</div>`+
                            `<div class="percentage-text" data-task-hash ="${task.hash}">${task.loadPercentage}%</div>`+
                        `</div>`+
                        `<div class="increase-cpu-load cpu-load-changer" data-cpu-load-direction="+1">&gt;</div>`+
                    `</div>`+
                `</div>`;
                task.on('complete', ()=>{this.updateCPULoadBalancer();});
            }
            this.$cpuTasksCol.html(html);
            $('.cpu-load-changer').on("click", (evt)=>{
                let rawDOMElement = evt.currentTarget,
                    row = rawDOMElement.parentElement.parentElement;
                this.alterCPULoad(row.dataset.taskHash, parseInt(rawDOMElement.dataset.cpuLoadDirection));
            });
        },
        alterCPULoad:function(taskHash, direction)
        {
            let cpuLoad = this.downlink.alterCPULoad(taskHash, direction);
            let hashes = Object.keys(cpuLoad);
            for(let hash of hashes)
            {
                $(`.percentage-bar[data-task-hash="${hash}"]`).css("width", `${cpuLoad[hash]}%`);
                $(`.percentage-text[data-task-hash="${hash}"]`).text(`${cpuLoad[hash]}%`);
            }
        },
        updateCurrentMissionView:function(server){
            this.updateCPULoadBalancer();
            this.$activeMissionPassword.val('');
            this.updateEncryptionGridUI(server.encryption.size, server.encryption.cols);
            this.$activeMissionEncryptionType.html(server.encryption.name);
            this.$activeMissionIPAddress.html(server.ipAddress);
            this.$activeMissionServerName.html(server.name);
        },
        updateAvailableMissionList:function(mission){
            $('.'+MISSION_LIST_CLASS).remove();
            this.$activeMissionName.html(mission.name);
            let html = '';
            for(let mission of this.downlink.availableMissions)
            {
                html += `<div class="row ${MISSION_LIST_CLASS}"><div class="col">${mission.name}</div></div>`;
            }
            let $html = $(html);
            this.$missionContainer.append($html);
        },
        addComputerToWorldMap(computer, callback)
        {
            let $node = $('<div/>')
                .addClass('computer')
                .attr('title', computer.name)
                .addClass(computer.constructor.name);
            if(callback)
            {
                $node.on("click", callback);
            }

            this.$worldMapContainer.append($node);
            let width = parseInt($node.css('width'), 10),
                height = parseInt($node.css('height'), 10);
            // This makes sure that the centre of the location is the centre of the div
            // which means that the lines between computer points go from centre point to centre point
            // instead of top left to top left
            $node.css({
                top:(computer.location.y - height / 2)+'px',
                left:(computer.location.x - width / 2)+'px'
            })
        },
        "hardReset":function()
        {
            this.stop();
            localStorage.removeItem('saveFile');
        },
        getJSON:function()
        {
            return this.downlink.toJSON();
        },
        save:function()
        {
            let json = this.getJSON();
            json.version = this.version;
            let jsonAsString = JSON.stringify(json),
                jsonAsAsciiSafeString = btoa(jsonAsString);
            localStorage.setItem('saveFile', jsonAsAsciiSafeString);
            return jsonAsAsciiSafeString;
        },
        parseLoadFile:function(loadFile)
        {
            let jsonAsString = atob(loadFile);
            return JSON.parse(jsonAsString);
        },
        load:function()
        {
            let jsonAsAsciiSafeString = localStorage.getItem('saveFile');
            if(jsonAsAsciiSafeString)
            {
                return this.parseLoadFile(jsonAsAsciiSafeString);
            }
            return null;
        },
        showConnectionManager:function()
        {
            this.$worldMapModal.modal({keyboard:false, backdrop:"static"});
        },
        showOrHideConnectionWarning:function()
        {
            if(this.downlink.playerConnection.connectionLength < 4)
            {
                this.$connectionWarningRow.show();
            }
            else
            {
                this.$connectionWarningRow.hide();
            }
        },
        afterHideConnectionManager:function()
        {
            this.$connectionTraced.html(0);
            this.$connectionLength.html(this.downlink.playerConnection.connectionLength);
            this.showOrHideConnectionWarning();
            this.save();
        },
        getRunTime:function()
        {
            return this.downlink.secondsRunning;
        },
        showSettingsModal:function()
        {
            this.$settingsModal.modal({keyboard:false, backdrop:"static"});
        },
        showComputerBuildModal:function()
        {
            this.$computerBuildModal.modal({keyboard:false, backdrop:"static"});
        },
        buildComputerPartsUI:function()
        {
            this.$computerPartsCPURow.empty();
            for(let cpu of CPU.getCPUs())
            {
                let cost = CPU.getPriceFor(cpu),
                    affordable = this.downlink.canAfford(cost);
                let $node = $(`<div data-part-cost="${cost.toString()}" class="col-4 cpu part ${affordable?"":"un"}affordable-part">
                        <div class="row"><div class="col">${cpu?'<img src="./img/'+cpu.img+'" alt="'+cpu.name+'"/>':""}</div></div>
                        <div class="row"><div class="col">${cpu.name}</div></div>
                        <div class="row"><div class="col">${cpu.speed} MHz</div></div>
                        <div class="row"><div class="col">${cost.toString()}</div></div>
                    </div>`);
                $node.click(() => {
                    this.setChosenPart(cpu, 'CPU', cost, $node);
                });

                this.$computerPartsCPURow.append($node);
            }
        },
        setChosenPart(part, type, cost, $node)
        {
            if(!this.downlink.canAfford(cost))
            {
                return;
            }
            $('.chosenPart').removeClass('chosenPart');
            if(part === this.chosenPart)
            {
                this.chosenPart = null;
                return;
            }
            this.chosenPart = part;
            $node.addClass('chosenPart');
        },
        updateComputerPartsUI:function()
        {
            let downlink = this.downlink;
            $('.part').each(function(){
                let $node = $(this),
                    cost = new Decimal($node.data('partCost')),
                    canAfford = downlink.canAfford(cost);
                $node.removeClass('affordable-part unaffordable-part').addClass(
                    (canAfford?'':'un')+'affordable-part'
                );
                if(!canAfford)
                {
                    $node.removeClass('chosenPart');
                    this.chosenPart = null;
                }
            });
        },
        getCPUIncreaseCost:function()
        {
            return this.downlink.cpuIncreaseCost;
        },
        buildComputerGrid:function()
        {
            let pc = this.downlink.playerComputer,
                cpus = pc.cpuPool.cpus,
                gridSize = pc.cpuWidth,
                html = '',
                width = `${(gridSize*31 + 1)}px`,
                cpuIndex = 0;
            this.$computerBuild.css({
                'grid-template-columns':`repeat(${gridSize}, 1fr)`,
                'width':width
            });
            //for(let cpu of cpus)
            for(let i = 0; i < pc.cpuPool.maxCPUs; i++)
            {
                let cpu = cpus[i];
                html += `<div data-cpu-slot="${cpuIndex}" class="col cpuHolder" title="${cpu?cpu.name:''}">`;
                if(cpu)
                {
                    html += `<img src="./img/${cpu.healthImage}" alt="${cpu.name}"/>`;
                }
                html += '</div>';
                cpuIndex++;
            }
            this.$computerBuild.html(html);

            this.$gridSizeIncreaseSpan.text(gridSize);
            let increaseCost = this.getCPUIncreaseCost();
            this.$gridSizeCostSpan.text(increaseCost);
            if(this.downlink.canAfford(increaseCost))
            {
                this.$gridSizeButton.removeAttr('disabled');
            }
            else
            {
                this.$gridSizeButton.attr('disabled', 'disabled');
            }

            $('.cpuHolder').click((evt)=> {
                let cpuSlot = $(evt.currentTarget).data('cpuSlot');
                this.buyCPU(cpuSlot)
            });
        },
        increaseCPUPoolSize:function()
        {
            if(!this.downlink.canAfford(this.getCPUIncreaseCost()))
            {
                return;
            }
            this.downlink.buyMaxCPUIncrease();
            this.buildComputerGrid();
            this.updatePlayerDetails();
            this.updateComputerPartsUI();
            this.save();
        },
        buyCPU:function(cpuSlot)
        {
            if(!this.chosenPart || !this.downlink.canAfford(CPU.getPriceFor(this.chosenPart)))
            {
                return;
            }
            this.canTakeMissions = true;
            this.downlink.buyCPU(this.chosenPart, cpuSlot);
            this.updateMissionToggleButton();
            this.buildComputerGrid();
            this.updateComputerBuild();
            this.updatePlayerDetails();
            this.updateComputerPartsUI();
            this.save();
        },
        handleEmptyCPUPool:function()
        {
            this.takingMissions = false;
            this.canTakeMissions = false;
            this.disconnect();
        },
        updateMissionToggleButton()
        {
            if(this.canTakeMissions)
            {
                this.$missionToggleButton.removeAttr('disabled');
            }
            else
            {
                this.$missionToggleButton.attr('disabled', 'disabled').text("Start taking missions");
            }
        },
        showResearchModal()
        {
            let html = ``;
            let availableResearch = this.downlink.availableResearch;
            for(let researchType in availableResearch)
            {
                html += `<h2 class="row">${researchType} (${availableResearch[researchType].length})</h2><div class="container-fluid">`;
                html += `<div class="row" style="font-weight: bold">
                    <div class="col">Research Task</div>
                    <div class="col-2">Cycles</div>
                    <div class="col-3">Research</div>
                </div>`
                for(let researchItem of availableResearch[researchType])
                {
                    html += `<div class="row">
                        <div class="col">${researchItem.name}</div>
                        <div class="col-2">${researchItem.researchTicks}</div>
                        <div class="col-3">
                            <button data-research-item="${researchItem.name}" class="research-start-button btn btn-sm btn-primary" data-toggle="tooltip" data-html="true" title="<ul>`;
                            for(let property of researchItem.propertiesEffected)
                            {
                                html += `<li>${property.property} &times; ${property.amount}</li>`;
                            }
                            html +=`</ul>">Start researching</button>
                        </div>
                    </div>`;
                }
                html += `</div>`;
            }
            this.$researchModalBody.html(html);
            $('[data-toggle="tooltip"]').tooltip();
            $('.research-start-button').click((evt)=>{
                this.startResearch(evt.target.dataset.researchItem);
            });
            this.$researchModal.modal({keyboard:false, backdrop:"static"});
        },
        startResearch:function(researchItem)
        {
            this.downlink.startResearch(researchItem);
            this.downlink.on('researchComplete', ()=>{
                this.updateComputerBuild();
                this.save();
            });
            this.$researchModal.modal('hide');
            this.updateCPULoadBalancer();
        }
    };

    game.start();

    window.game = game;
})})(window.jQuery);

},{"./Computers/CPU":9,"./Computers/Tasks/EncryptionCracker":18,"./Computers/Tasks/PasswordCracker":19,"./Downlink":24,"break_infinity.js":1}],27:[function(require,module,exports){
module.exports = {
    shuffleArray:function(array)
    {
        for (let i = array.length - 1; i > 0; i--)
        {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },
    popRandomArrayElement:function(array)
    {
        this.shuffleArray(array);
        return array.pop();
    },
    getRandomArrayElement:function(array)
    {
        return array[Math.floor(Math.random() * array.length)];
    },
    removeArrayElement(array, element)
    {
        let index = array.indexOf(element);
        if(index >= 0)
        {
            array.splice(index, 1);
        }
        return array;
    },
    getRandomIntegerBetween(min, max)
    {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

};

},{}],28:[function(require,module,exports){
const EventListener = require('../../EventListener');

class Challenge extends EventListener
{
    /**
     * An abstract class to represent all challenges a MissionComputer might have
     * I could namescape this in Missions, and may do this later but currently exists in the namespace
     * Downlink.Challenges.Challenge
     *
     * @param {string} name         The name of the challenge, useful for UI purposes
     * @param {number} difficulty   An int to describe in some abstract manner what reward ratio this challenge
     *     should provide. Provided in the form of an integer.
     */
    constructor(name, difficulty)
    {
        super();
        this.name = name;
        this.difficulty = difficulty;
        this.solved = false;
        this.task = null;
        /**
         * @type {MissionComputer}
         */
        this.computer = null;
    }

    get hash()
    {
        return `${this.computer.uniqueID}_${this.name}`;
    }

    /**
     * @param {MissionComputer} computer
     */
    setComputer(computer)
    {
        this.computer = computer;
        return this;
    }

    setTask(task)
    {
        this.task = task;
        return this;
    }

    solve()
    {
        this.signalSolved();
    }

    /**
     * A method to signal to the Mission Computers, or localhost that a Challenge has been complete.
     */
    signalSolved()
    {
        this.solved = true;
        this.trigger('solved');
        return this;
    }

    get calculatedDifficulty()
    {
        throw new Error('Unimplemented abstract method');
    }

    static get difficultyExponent()
    {
        return 0.25;
    }
}

module.exports = Challenge;

},{"../../EventListener":25}],29:[function(require,module,exports){
const   Challenge = require('./Challenge'),
        helper = require('../../Helpers');
class Encryption extends Challenge
{
    /**
     *
     * @param {number} difficulty
     */
    constructor(difficulty)
    {
        let rows = Encryption.getDimensionForDifficulty(difficulty),
            cols = Encryption.getDimensionForDifficulty(difficulty),
            size = rows * cols;
        let name = "Linear";
        if(difficulty > 10)
        {
            name = 'Cubic';
        }
        else if(difficulty > 5)
        {
            name = 'Quadratic';
        }
        super(name + ' Encryption', difficulty);
        this.rows = rows;
        this.cols = cols;
        this.size = size;
    }

    get calculatedDifficulty()
    {
        return Math.pow(Math.min(this.rows, this.cols), Challenge.difficultyExponent);
    }

    static getDimensionForDifficulty(difficulty)
    {
        const   flooredDifficulty = Math.floor(difficulty),
                min = (5 + flooredDifficulty),
                max = (5 + flooredDifficulty) * 2;
        return helper.getRandomIntegerBetween(min, max);
    }
}

module.exports = Encryption;

},{"../../Helpers":27,"./Challenge":28}],30:[function(require,module,exports){
const   dictionary = require('./dictionary'),
        Challenge = require('./Challenge'),
        Alphabet = require('../../Alphabet'),
        helpers = require('../../Helpers');

const PASSWORD_TYPES = {
    'DICTIONARY':'Dictionary',
    'ALPHANUMERIC':'Alphanumeric'
};
const PASSWORD_DICTIONARY_DIFFICULTIES = {
    'EASIEST':1,
    'HARDEST':3
};

class Password extends Challenge
{
    constructor(text, difficulty, type)
    {
        super(type + ' Password', difficulty) ;
        this.text = text;
        this.length = text.length;
    }

    attack(testPassword)
    {
        this.trigger('start');
        return testPassword === this.text;
    }

    get calculatedDifficulty()
    {
        return Math.pow(this.length, Challenge.difficultyExponent);
    }

    static get PASSWORD_DICTIONARY_DIFFICULTIES()
    {
        return PASSWORD_DICTIONARY_DIFFICULTIES;
    }

    static getPasswordForDifficulty(difficulty)
    {
        if(difficulty <= PASSWORD_DICTIONARY_DIFFICULTIES.HARDEST)
        {
            return DictionaryPassword.getRandomPassword(difficulty);
        }
        return AlphanumericPassword.getRandomPassword(difficulty);
    }

}

class AlphanumericPassword extends Password
{
    constructor(text, difficulty)
    {
        super(text, difficulty, 'Alphanumeric');
        this.lettersSolved = 0;
    }

    attackLetter(letter)
    {
        if(this.text.charAt(this.lettersSolved) === letter)
        {
            this.lettersSolved ++;
            return true;
        }
        return false;
    }

    static getRandomPassword(difficulty)
    {
        let stringLength = helpers.getRandomIntegerBetween(5, 10) + Math.floor(difficulty);
        let password = '';
        for (let i = 0; i < stringLength; i++)
        {
            password += Alphabet.getRandomLetter();
        }
        return new AlphanumericPassword(password, difficulty);
    }
}

class DictionaryPassword extends Password
{
    constructor(text, difficulty, dictionary)
    {
        super(text, difficulty, 'Dictionary');
        this.dictionary = dictionary;
    }

    /**
     *
     * @param {number} difficulty should be between one and 10
     * @returns {DictionaryPassword}
     */
    static getRandomPassword(difficulty)
    {
        let usedDictionary = DictionaryPassword.reduceDictionary(PASSWORD_DICTIONARY_DIFFICULTIES.HARDEST - Math.min(Math.floor(difficulty), PASSWORD_DICTIONARY_DIFFICULTIES.HARDEST)),
            password = helpers.getRandomArrayElement(usedDictionary);
        return new DictionaryPassword(password, difficulty, usedDictionary);
    }

    static reduceDictionary(reduction)
    {
        let reducedDictionary = [];
        dictionary.forEach((entry, index)=>{if(index%PASSWORD_DICTIONARY_DIFFICULTIES.HARDEST >= reduction){reducedDictionary.push(entry);}});
        return reducedDictionary;
    }
}

module.exports = {Password:Password, DictionaryPassword:DictionaryPassword, AlphanumericPassword:AlphanumericPassword};

},{"../../Alphabet":6,"../../Helpers":27,"./Challenge":28,"./dictionary":31}],31:[function(require,module,exports){
// stolen from Bart Busschot's xkpasswd JS github repo
// See https://github.com/bbusschots/hsxkpasswd.js

let dictionary = [
    'abandoned',
    'abilities',
    'aboriginal',
    'absolutely',
    'absorption',
    'abstracts',
    'academics',
    'acceptable',
    'acceptance',
    'accepting',
    'accessibility',
    'accessible',
    'accessing',
    'accessories',
    'accessory',
    'accidents',
    'accommodate',
    'accommodation',
    'accommodations',
    'accompanied',
    'accompanying',
    'accomplish',
    'accomplished',
    'accordance',
    'according',
    'accordingly',
    'accountability',
    'accounting',
    'accreditation',
    'accredited',
    'accurately',
    'acdbentity',
    'achievement',
    'achievements',
    'achieving',
    'acknowledge',
    'acknowledged',
    'acquisition',
    'acquisitions',
    'activated',
    'activation',
    'activists',
    'activities',
    'adaptation',
    'addiction',
    'additional',
    'additionally',
    'additions',
    'addressed',
    'addresses',
    'addressing',
    'adjective',
    'adjustable',
    'adjustment',
    'adjustments',
    'administered',
    'administration',
    'administrative',
    'administrator',
    'administrators',
    'admission',
    'admissions',
    'adolescent',
    'advancement',
    'advantage',
    'advantages',
    'adventure',
    'adventures',
    'advertise',
    'advertisement',
    'advertisements',
    'advertiser',
    'advertisers',
    'advertising',
    'aerospace',
    'affecting',
    'affiliate',
    'affiliated',
    'affiliates',
    'affiliation',
    'affordable',
    'afghanistan',
    'afternoon',
    'afterwards',
    'aggregate',
    'aggressive',
    'agreement',
    'agreements',
    'agricultural',
    'agriculture',
    'albuquerque',
    'alexander',
    'alexandria',
    'algorithm',
    'algorithms',
    'alignment',
    'allocated',
    'allocation',
    'allowance',
    'alphabetical',
    'alternate',
    'alternative',
    'alternatively',
    'alternatives',
    'aluminium',
    'ambassador',
    'amendment',
    'amendments',
    'amenities',
    'americans',
    'amplifier',
    'amsterdam',
    'analytical',
    'animation',
    'anniversary',
    'annotated',
    'annotation',
    'announced',
    'announcement',
    'announcements',
    'announces',
    'anonymous',
    'answering',
    'antarctica',
    'anthropology',
    'antibodies',
    'anticipated',
    'antivirus',
    'apartment',
    'apartments',
    'apparatus',
    'apparently',
    'appearance',
    'appearing',
    'appliance',
    'appliances',
    'applicable',
    'applicant',
    'applicants',
    'application',
    'applications',
    'appointed',
    'appointment',
    'appointments',
    'appraisal',
    'appreciate',
    'appreciated',
    'appreciation',
    'approaches',
    'appropriate',
    'appropriations',
    'approximate',
    'approximately',
    'arbitrary',
    'arbitration',
    'architect',
    'architects',
    'architectural',
    'architecture',
    'argentina',
    'arguments',
    'arlington',
    'armstrong',
    'arrangement',
    'arrangements',
    'arthritis',
    'artificial',
    'assembled',
    'assessing',
    'assessment',
    'assessments',
    'assignment',
    'assignments',
    'assistance',
    'assistant',
    'associate',
    'associated',
    'associates',
    'association',
    'associations',
    'assumption',
    'assumptions',
    'assurance',
    'astrology',
    'astronomy',
    'athletics',
    'atmosphere',
    'atmospheric',
    'attachment',
    'attachments',
    'attempted',
    'attempting',
    'attendance',
    'attending',
    'attention',
    'attitudes',
    'attorneys',
    'attraction',
    'attractions',
    'attractive',
    'attribute',
    'attributes',
    'australia',
    'australian',
    'authentic',
    'authentication',
    'authorities',
    'authority',
    'authorization',
    'authorized',
    'automated',
    'automatic',
    'automatically',
    'automation',
    'automobile',
    'automobiles',
    'automotive',
    'availability',
    'available',
    'awareness',
    'azerbaijan',
    'background',
    'backgrounds',
    'bacterial',
    'baltimore',
    'bandwidth',
    'bangladesh',
    'bankruptcy',
    'barcelona',
    'basically',
    'basketball',
    'bathrooms',
    'batteries',
    'battlefield',
    'beastality',
    'beautiful',
    'beautifully',
    'beginners',
    'beginning',
    'behavioral',
    'behaviour',
    'benchmark',
    'beneficial',
    'bestsellers',
    'beverages',
    'bibliographic',
    'bibliography',
    'biodiversity',
    'biographies',
    'biography',
    'biological',
    'biotechnology',
    'birmingham',
    'blackberry',
    'blackjack',
    'bloomberg',
    'bluetooth',
    'bookmarks',
    'bookstore',
    'boulevard',
    'boundaries',
    'bracelets',
    'brazilian',
    'breakdown',
    'breakfast',
    'breathing',
    'brilliant',
    'britannica',
    'broadband',
    'broadcast',
    'broadcasting',
    'brochures',
    'brunswick',
    'buildings',
    'bulgarian',
    'burlington',
    'businesses',
    'butterfly',
    'calculate',
    'calculated',
    'calculation',
    'calculations',
    'calculator',
    'calculators',
    'calendars',
    'calibration',
    'california',
    'cambridge',
    'camcorder',
    'camcorders',
    'campaigns',
    'cancellation',
    'cancelled',
    'candidate',
    'candidates',
    'capabilities',
    'capability',
    'cardiovascular',
    'carefully',
    'caribbean',
    'cartridge',
    'cartridges',
    'catalogue',
    'categories',
    'cathedral',
    'catherine',
    'celebrate',
    'celebration',
    'celebrities',
    'celebrity',
    'centuries',
    'certainly',
    'certificate',
    'certificates',
    'certification',
    'certified',
    'challenge',
    'challenged',
    'challenges',
    'challenging',
    'champagne',
    'champions',
    'championship',
    'championships',
    'chancellor',
    'changelog',
    'character',
    'characteristic',
    'characteristics',
    'characterization',
    'characterized',
    'characters',
    'charitable',
    'charleston',
    'charlotte',
    'checklist',
    'chemicals',
    'chemistry',
    'chevrolet',
    'childhood',
    'childrens',
    'chocolate',
    'cholesterol',
    'christian',
    'christianity',
    'christians',
    'christina',
    'christine',
    'christmas',
    'christopher',
    'chronicle',
    'chronicles',
    'cigarette',
    'cigarettes',
    'cincinnati',
    'circulation',
    'circumstances',
    'citations',
    'citizenship',
    'citysearch',
    'civilization',
    'classical',
    'classification',
    'classified',
    'classifieds',
    'classroom',
    'clearance',
    'cleveland',
    'coalition',
    'cognitive',
    'collaboration',
    'collaborative',
    'colleague',
    'colleagues',
    'collectables',
    'collected',
    'collectible',
    'collectibles',
    'collecting',
    'collection',
    'collections',
    'collective',
    'collector',
    'collectors',
    'columnists',
    'combination',
    'combinations',
    'combining',
    'comfortable',
    'commander',
    'commentary',
    'commented',
    'commercial',
    'commission',
    'commissioner',
    'commissioners',
    'commissions',
    'commitment',
    'commitments',
    'committed',
    'committee',
    'committees',
    'commodities',
    'commodity',
    'commonwealth',
    'communicate',
    'communication',
    'communications',
    'communist',
    'communities',
    'community',
    'companies',
    'companion',
    'comparable',
    'comparative',
    'comparing',
    'comparison',
    'comparisons',
    'compatibility',
    'compatible',
    'compensation',
    'competent',
    'competing',
    'competition',
    'competitions',
    'competitive',
    'competitors',
    'compilation',
    'complaint',
    'complaints',
    'complement',
    'completed',
    'completely',
    'completing',
    'completion',
    'complexity',
    'compliance',
    'compliant',
    'complicated',
    'complications',
    'complimentary',
    'component',
    'components',
    'composite',
    'composition',
    'compounds',
    'comprehensive',
    'compressed',
    'compression',
    'compromise',
    'computation',
    'computational',
    'computers',
    'computing',
    'concentrate',
    'concentration',
    'concentrations',
    'conceptual',
    'concerned',
    'concerning',
    'concluded',
    'conclusion',
    'conclusions',
    'condition',
    'conditional',
    'conditioning',
    'conditions',
    'conducted',
    'conducting',
    'conference',
    'conferences',
    'conferencing',
    'confidence',
    'confident',
    'confidential',
    'confidentiality',
    'configuration',
    'configurations',
    'configure',
    'configured',
    'configuring',
    'confirmation',
    'confirmed',
    'conflicts',
    'confusion',
    'congratulations',
    'congressional',
    'conjunction',
    'connected',
    'connecticut',
    'connecting',
    'connection',
    'connections',
    'connectivity',
    'connector',
    'connectors',
    'conscious',
    'consciousness',
    'consecutive',
    'consensus',
    'consequence',
    'consequences',
    'consequently',
    'conservation',
    'conservative',
    'considerable',
    'consideration',
    'considerations',
    'considered',
    'considering',
    'considers',
    'consistency',
    'consistent',
    'consistently',
    'consisting',
    'consolidated',
    'consolidation',
    'consonant',
    'consortium',
    'conspiracy',
    'constantly',
    'constitute',
    'constitutes',
    'constitution',
    'constitutional',
    'constraint',
    'constraints',
    'construct',
    'constructed',
    'construction',
    'consultancy',
    'consultant',
    'consultants',
    'consultation',
    'consulting',
    'consumers',
    'consumption',
    'contacted',
    'contacting',
    'contained',
    'container',
    'containers',
    'containing',
    'contamination',
    'contemporary',
    'continent',
    'continental',
    'continually',
    'continued',
    'continues',
    'continuing',
    'continuity',
    'continuous',
    'continuously',
    'contracting',
    'contractor',
    'contractors',
    'contracts',
    'contribute',
    'contributed',
    'contributing',
    'contribution',
    'contributions',
    'contributor',
    'contributors',
    'controlled',
    'controller',
    'controllers',
    'controlling',
    'controversial',
    'controversy',
    'convenience',
    'convenient',
    'convention',
    'conventional',
    'conventions',
    'convergence',
    'conversation',
    'conversations',
    'conversion',
    'converted',
    'converter',
    'convertible',
    'convicted',
    'conviction',
    'convinced',
    'cooperation',
    'cooperative',
    'coordinate',
    'coordinated',
    'coordinates',
    'coordination',
    'coordinator',
    'copenhagen',
    'copyright',
    'copyrighted',
    'copyrights',
    'corporate',
    'corporation',
    'corporations',
    'corrected',
    'correction',
    'corrections',
    'correctly',
    'correlation',
    'correspondence',
    'corresponding',
    'corruption',
    'cosmetics',
    'counseling',
    'countries',
    'creations',
    'creativity',
    'creatures',
    'criterion',
    'criticism',
    'crossword',
    'cumulative',
    'currencies',
    'currently',
    'curriculum',
    'customers',
    'customise',
    'customize',
    'customized',
    'dangerous',
    'databases',
    'daughters',
    'decisions',
    'declaration',
    'decorating',
    'decorative',
    'decreased',
    'dedicated',
    'defendant',
    'defensive',
    'definitely',
    'definition',
    'definitions',
    'delegation',
    'delicious',
    'delivered',
    'delivering',
    'demanding',
    'democracy',
    'democratic',
    'democrats',
    'demographic',
    'demonstrate',
    'demonstrated',
    'demonstrates',
    'demonstration',
    'department',
    'departmental',
    'departments',
    'departure',
    'dependence',
    'dependent',
    'depending',
    'deployment',
    'depression',
    'descending',
    'described',
    'describes',
    'describing',
    'description',
    'descriptions',
    'designated',
    'designation',
    'designers',
    'designing',
    'desirable',
    'desperate',
    'destination',
    'destinations',
    'destroyed',
    'destruction',
    'detection',
    'detective',
    'determination',
    'determine',
    'determined',
    'determines',
    'determining',
    'deutschland',
    'developed',
    'developer',
    'developers',
    'developing',
    'development',
    'developmental',
    'developments',
    'deviation',
    'diagnosis',
    'diagnostic',
    'dictionaries',
    'dictionary',
    'difference',
    'differences',
    'different',
    'differential',
    'differently',
    'difficult',
    'difficulties',
    'difficulty',
    'dimension',
    'dimensional',
    'dimensions',
    'direction',
    'directions',
    'directive',
    'directories',
    'directors',
    'directory',
    'disabilities',
    'disability',
    'disappointed',
    'discharge',
    'disciplinary',
    'discipline',
    'disciplines',
    'disclaimer',
    'disclaimers',
    'disclosure',
    'discounted',
    'discounts',
    'discovered',
    'discovery',
    'discretion',
    'discrimination',
    'discussed',
    'discusses',
    'discussing',
    'discussion',
    'discussions',
    'disorders',
    'dispatched',
    'displayed',
    'displaying',
    'disposition',
    'distances',
    'distinction',
    'distinguished',
    'distribute',
    'distributed',
    'distribution',
    'distributions',
    'distributor',
    'distributors',
    'districts',
    'disturbed',
    'diversity',
    'divisions',
    'documentary',
    'documentation',
    'documented',
    'documents',
    'dominican',
    'donations',
    'downloadable',
    'downloaded',
    'downloading',
    'downloads',
    'dramatically',
    'duplicate',
    'earthquake',
    'ecological',
    'ecommerce',
    'economics',
    'economies',
    'edinburgh',
    'editorial',
    'editorials',
    'education',
    'educational',
    'educators',
    'effective',
    'effectively',
    'effectiveness',
    'efficiency',
    'efficient',
    'efficiently',
    'elections',
    'electoral',
    'electrical',
    'electricity',
    'electronic',
    'electronics',
    'elementary',
    'elevation',
    'eligibility',
    'eliminate',
    'elimination',
    'elizabeth',
    'elsewhere',
    'emergency',
    'emissions',
    'emotional',
    'empirical',
    'employees',
    'employers',
    'employment',
    'enclosure',
    'encounter',
    'encountered',
    'encourage',
    'encouraged',
    'encourages',
    'encouraging',
    'encryption',
    'encyclopedia',
    'endangered',
    'endorsement',
    'enforcement',
    'engagement',
    'engineering',
    'engineers',
    'enhancement',
    'enhancements',
    'enhancing',
    'enlargement',
    'enquiries',
    'enrollment',
    'enterprise',
    'enterprises',
    'entertaining',
    'entertainment',
    'entrepreneur',
    'entrepreneurs',
    'environment',
    'environmental',
    'environments',
    'equations',
    'equilibrium',
    'equipment',
    'equivalent',
    'especially',
    'essential',
    'essentially',
    'essentials',
    'establish',
    'established',
    'establishing',
    'establishment',
    'estimated',
    'estimates',
    'estimation',
    'evaluated',
    'evaluating',
    'evaluation',
    'evaluations',
    'evanescence',
    'eventually',
    'everybody',
    'everything',
    'everywhere',
    'evolution',
    'examination',
    'examinations',
    'examining',
    'excellence',
    'excellent',
    'exception',
    'exceptional',
    'exceptions',
    'excessive',
    'exchanges',
    'excitement',
    'excluding',
    'exclusion',
    'exclusive',
    'exclusively',
    'execution',
    'executive',
    'executives',
    'exemption',
    'exercises',
    'exhibition',
    'exhibitions',
    'existence',
    'expanding',
    'expansion',
    'expectations',
    'expenditure',
    'expenditures',
    'expensive',
    'experience',
    'experienced',
    'experiences',
    'experiencing',
    'experiment',
    'experimental',
    'experiments',
    'expertise',
    'expiration',
    'explained',
    'explaining',
    'explanation',
    'explicitly',
    'exploration',
    'exploring',
    'explosion',
    'expressed',
    'expression',
    'expressions',
    'extending',
    'extension',
    'extensions',
    'extensive',
    'extraction',
    'extraordinary',
    'extremely',
    'facilitate',
    'facilities',
    'factories',
    'fairfield',
    'fantastic',
    'fascinating',
    'favorites',
    'favourite',
    'favourites',
    'featuring',
    'federation',
    'fellowship',
    'festivals',
    'filtering',
    'financial',
    'financing',
    'findarticles',
    'finishing',
    'fireplace',
    'fisheries',
    'flexibility',
    'following',
    'forbidden',
    'forecasts',
    'forgotten',
    'formation',
    'formatting',
    'forwarding',
    'foundation',
    'foundations',
    'fragrance',
    'fragrances',
    'framework',
    'franchise',
    'francisco',
    'frankfurt',
    'frederick',
    'freelance',
    'frequencies',
    'frequency',
    'frequently',
    'friendship',
    'frontpage',
    'functional',
    'functionality',
    'functioning',
    'functions',
    'fundamental',
    'fundamentals',
    'fundraising',
    'furnished',
    'furnishings',
    'furniture',
    'furthermore',
    'galleries',
    'gardening',
    'gathering',
    'genealogy',
    'generally',
    'generated',
    'generates',
    'generating',
    'generation',
    'generations',
    'generator',
    'generators',
    'gentleman',
    'geographic',
    'geographical',
    'geography',
    'geological',
    'gibraltar',
    'girlfriend',
    'governance',
    'governing',
    'government',
    'governmental',
    'governments',
    'gradually',
    'graduated',
    'graduates',
    'graduation',
    'graphical',
    'greenhouse',
    'greensboro',
    'greetings',
    'groundwater',
    'guarantee',
    'guaranteed',
    'guarantees',
    'guatemala',
    'guestbook',
    'guidelines',
    'halloween',
    'hampshire',
    'handhelds',
    'happening',
    'happiness',
    'harassment',
    'hardcover',
    'hazardous',
    'headlines',
    'headphones',
    'headquarters',
    'healthcare',
    'helicopter',
    'henderson',
    'hepatitis',
    'hierarchy',
    'highlight',
    'highlighted',
    'highlights',
    'historical',
    'hollywood',
    'holocaust',
    'hopefully',
    'horizontal',
    'hospitality',
    'hospitals',
    'household',
    'households',
    'housewares',
    'housewives',
    'humanitarian',
    'humanities',
    'hungarian',
    'huntington',
    'hurricane',
    'hydraulic',
    'hydrocodone',
    'hypothesis',
    'hypothetical',
    'identical',
    'identification',
    'identified',
    'identifier',
    'identifies',
    'identifying',
    'illustrated',
    'illustration',
    'illustrations',
    'imagination',
    'immediate',
    'immediately',
    'immigrants',
    'immigration',
    'immunology',
    'implement',
    'implementation',
    'implemented',
    'implementing',
    'implications',
    'importance',
    'important',
    'importantly',
    'impossible',
    'impressed',
    'impression',
    'impressive',
    'improvement',
    'improvements',
    'improving',
    'inappropriate',
    'incentive',
    'incentives',
    'incidence',
    'incidents',
    'including',
    'inclusion',
    'inclusive',
    'incomplete',
    'incorporate',
    'incorporated',
    'incorrect',
    'increased',
    'increases',
    'increasing',
    'increasingly',
    'incredible',
    'independence',
    'independent',
    'independently',
    'indianapolis',
    'indicated',
    'indicates',
    'indicating',
    'indication',
    'indicator',
    'indicators',
    'indigenous',
    'individual',
    'individually',
    'individuals',
    'indonesia',
    'indonesian',
    'induction',
    'industrial',
    'industries',
    'inexpensive',
    'infection',
    'infections',
    'infectious',
    'inflation',
    'influence',
    'influenced',
    'influences',
    'information',
    'informational',
    'informative',
    'infrastructure',
    'infringement',
    'ingredients',
    'inherited',
    'initially',
    'initiated',
    'initiative',
    'initiatives',
    'injection',
    'innovation',
    'innovations',
    'innovative',
    'inquiries',
    'insertion',
    'inspection',
    'inspections',
    'inspector',
    'inspiration',
    'installation',
    'installations',
    'installed',
    'installing',
    'instances',
    'instantly',
    'institute',
    'institutes',
    'institution',
    'institutional',
    'institutions',
    'instruction',
    'instructional',
    'instructions',
    'instructor',
    'instructors',
    'instrument',
    'instrumental',
    'instrumentation',
    'instruments',
    'insulation',
    'insurance',
    'integrate',
    'integrated',
    'integrating',
    'integration',
    'integrity',
    'intellectual',
    'intelligence',
    'intelligent',
    'intensity',
    'intensive',
    'intention',
    'interaction',
    'interactions',
    'interactive',
    'interested',
    'interesting',
    'interests',
    'interface',
    'interfaces',
    'interference',
    'intermediate',
    'international',
    'internationally',
    'internship',
    'interpretation',
    'interpreted',
    'interracial',
    'intersection',
    'interstate',
    'intervals',
    'intervention',
    'interventions',
    'interview',
    'interviews',
    'introduce',
    'introduced',
    'introduces',
    'introducing',
    'introduction',
    'introductory',
    'invention',
    'inventory',
    'investigate',
    'investigated',
    'investigation',
    'investigations',
    'investigator',
    'investigators',
    'investing',
    'investment',
    'investments',
    'investors',
    'invisible',
    'invitation',
    'invitations',
    'involvement',
    'involving',
    'irrigation',
    'isolation',
    'jacksonville',
    'javascript',
    'jefferson',
    'jerusalem',
    'jewellery',
    'journalism',
    'journalist',
    'journalists',
    'jurisdiction',
    'kazakhstan',
    'keyboards',
    'kilometers',
    'knowledge',
    'knowledgestorm',
    'laboratories',
    'laboratory',
    'lafayette',
    'lancaster',
    'landscape',
    'landscapes',
    'languages',
    'lauderdale',
    'leadership',
    'legendary',
    'legislation',
    'legislative',
    'legislature',
    'legitimate',
    'lexington',
    'liabilities',
    'liability',
    'librarian',
    'libraries',
    'licensing',
    'liechtenstein',
    'lifestyle',
    'lightning',
    'lightweight',
    'likelihood',
    'limitation',
    'limitations',
    'limousines',
    'listening',
    'listprice',
    'literally',
    'literature',
    'lithuania',
    'litigation',
    'liverpool',
    'livestock',
    'locations',
    'logistics',
    'longitude',
    'looksmart',
    'louisiana',
    'louisville',
    'luxembourg',
    'macedonia',
    'machinery',
    'macintosh',
    'macromedia',
    'madagascar',
    'magazines',
    'magnificent',
    'magnitude',
    'mainstream',
    'maintained',
    'maintaining',
    'maintains',
    'maintenance',
    'malpractice',
    'management',
    'manchester',
    'mandatory',
    'manhattan',
    'manufacture',
    'manufactured',
    'manufacturer',
    'manufacturers',
    'manufacturing',
    'marijuana',
    'marketing',
    'marketplace',
    'massachusetts',
    'mastercard',
    'masturbating',
    'masturbation',
    'materials',
    'maternity',
    'mathematical',
    'mathematics',
    'mauritius',
    'meaningful',
    'meanwhile',
    'measurement',
    'measurements',
    'measuring',
    'mechanical',
    'mechanics',
    'mechanism',
    'mechanisms',
    'mediawiki',
    'medication',
    'medications',
    'medicines',
    'meditation',
    'mediterranean',
    'melbourne',
    'membership',
    'memorabilia',
    'mentioned',
    'merchandise',
    'merchants',
    'messaging',
    'messenger',
    'metabolism',
    'metallica',
    'methodology',
    'metropolitan',
    'microphone',
    'microsoft',
    'microwave',
    'migration',
    'milfhunter',
    'millennium',
    'milwaukee',
    'miniature',
    'ministers',
    'ministries',
    'minneapolis',
    'minnesota',
    'miscellaneous',
    'mississippi',
    'mitsubishi',
    'modelling',
    'moderator',
    'moderators',
    'modification',
    'modifications',
    'molecular',
    'molecules',
    'monitored',
    'monitoring',
    'montgomery',
    'mortality',
    'mortgages',
    'motherboard',
    'motivated',
    'motivation',
    'motorcycle',
    'motorcycles',
    'mountains',
    'movements',
    'mozambique',
    'multimedia',
    'municipal',
    'municipality',
    'musicians',
    'mysterious',
    'namespace',
    'narrative',
    'nashville',
    'nationally',
    'nationwide',
    'naturally',
    'navigation',
    'navigator',
    'necessarily',
    'necessary',
    'necessity',
    'negotiation',
    'negotiations',
    'neighborhood',
    'neighbors',
    'netherlands',
    'networking',
    'nevertheless',
    'newcastle',
    'newfoundland',
    'newsletter',
    'newsletters',
    'newspaper',
    'newspapers',
    'nicaragua',
    'nightlife',
    'nightmare',
    'nominated',
    'nomination',
    'nominations',
    'nonprofit',
    'northeast',
    'northwest',
    'norwegian',
    'notebooks',
    'notification',
    'notifications',
    'nottingham',
    'numerical',
    'nutrition',
    'nutritional',
    'obituaries',
    'objective',
    'objectives',
    'obligation',
    'obligations',
    'observation',
    'observations',
    'obtaining',
    'obviously',
    'occasional',
    'occasionally',
    'occasions',
    'occupation',
    'occupational',
    'occupations',
    'occurrence',
    'occurring',
    'offensive',
    'offerings',
    'officially',
    'officials',
    'omissions',
    'operating',
    'operation',
    'operational',
    'operations',
    'operators',
    'opponents',
    'opportunities',
    'opportunity',
    'opposition',
    'optimization',
    'orchestra',
    'ordinance',
    'organisation',
    'organisations',
    'organised',
    'organisms',
    'organization',
    'organizational',
    'organizations',
    'organized',
    'organizer',
    'organizing',
    'orientation',
    'originally',
    'otherwise',
    'ourselves',
    'outsourcing',
    'outstanding',
    'overnight',
    'ownership',
    'packaging',
    'paintball',
    'paintings',
    'palestine',
    'palestinian',
    'panasonic',
    'pantyhose',
    'paperback',
    'paperbacks',
    'paragraph',
    'paragraphs',
    'parameter',
    'parameters',
    'parenting',
    'parliament',
    'parliamentary',
    'partially',
    'participant',
    'participants',
    'participate',
    'participated',
    'participating',
    'participation',
    'particles',
    'particular',
    'particularly',
    'partition',
    'partnership',
    'partnerships',
    'passenger',
    'passengers',
    'passwords',
    'pathology',
    'pediatric',
    'penalties',
    'penetration',
    'peninsula',
    'pennsylvania',
    'perceived',
    'percentage',
    'perception',
    'perfectly',
    'performance',
    'performances',
    'performed',
    'performer',
    'performing',
    'periodically',
    'peripheral',
    'peripherals',
    'permalink',
    'permanent',
    'permission',
    'permissions',
    'permitted',
    'persistent',
    'personality',
    'personalized',
    'personally',
    'personals',
    'personnel',
    'perspective',
    'perspectives',
    'petersburg',
    'petroleum',
    'pharmaceutical',
    'pharmaceuticals',
    'pharmacies',
    'pharmacology',
    'phenomenon',
    'phentermine',
    'philadelphia',
    'philippines',
    'philosophy',
    'photograph',
    'photographer',
    'photographers',
    'photographic',
    'photographs',
    'photography',
    'photoshop',
    'physically',
    'physician',
    'physicians',
    'physiology',
    'pichunter',
    'pittsburgh',
    'placement',
    'plaintiff',
    'platforms',
    'playstation',
    'political',
    'politicians',
    'pollution',
    'polyester',
    'polyphonic',
    'popularity',
    'population',
    'populations',
    'porcelain',
    'portfolio',
    'portraits',
    'portsmouth',
    'portuguese',
    'positioning',
    'positions',
    'possession',
    'possibilities',
    'possibility',
    'postcards',
    'postposted',
    'potential',
    'potentially',
    'powerpoint',
    'powerseller',
    'practical',
    'practices',
    'practitioner',
    'practitioners',
    'preceding',
    'precipitation',
    'precisely',
    'precision',
    'predicted',
    'prediction',
    'predictions',
    'preference',
    'preferences',
    'preferred',
    'pregnancy',
    'preliminary',
    'preparation',
    'preparing',
    'prerequisite',
    'prescribed',
    'prescription',
    'presentation',
    'presentations',
    'presented',
    'presenting',
    'presently',
    'preservation',
    'president',
    'presidential',
    'presidents',
    'preventing',
    'prevention',
    'previously',
    'primarily',
    'princeton',
    'principal',
    'principle',
    'principles',
    'printable',
    'priorities',
    'prisoners',
    'privilege',
    'privileges',
    'probability',
    'procedure',
    'procedures',
    'proceeding',
    'proceedings',
    'processed',
    'processes',
    'processing',
    'processor',
    'processors',
    'procurement',
    'producers',
    'producing',
    'production',
    'productions',
    'productive',
    'productivity',
    'profession',
    'professional',
    'professionals',
    'professor',
    'programme',
    'programmer',
    'programmers',
    'programmes',
    'programming',
    'progressive',
    'prohibited',
    'projected',
    'projection',
    'projector',
    'projectors',
    'prominent',
    'promising',
    'promoting',
    'promotion',
    'promotional',
    'promotions',
    'properties',
    'proportion',
    'proposals',
    'proposition',
    'proprietary',
    'prospective',
    'prospects',
    'prostores',
    'protected',
    'protecting',
    'protection',
    'protective',
    'protocols',
    'prototype',
    'providence',
    'providers',
    'providing',
    'provinces',
    'provincial',
    'provision',
    'provisions',
    'psychiatry',
    'psychological',
    'psychology',
    'publication',
    'publications',
    'publicity',
    'published',
    'publisher',
    'publishers',
    'publishing',
    'punishment',
    'purchased',
    'purchases',
    'purchasing',
    'qualification',
    'qualifications',
    'qualified',
    'qualifying',
    'qualities',
    'quantitative',
    'quantities',
    'quarterly',
    'queensland',
    'questionnaire',
    'questions',
    'quotations',
    'radiation',
    'reactions',
    'realistic',
    'reasonable',
    'reasonably',
    'reasoning',
    'receivers',
    'receiving',
    'reception',
    'receptors',
    'recipient',
    'recipients',
    'recognised',
    'recognition',
    'recognize',
    'recognized',
    'recommend',
    'recommendation',
    'recommendations',
    'recommended',
    'recommends',
    'reconstruction',
    'recorders',
    'recording',
    'recordings',
    'recovered',
    'recreation',
    'recreational',
    'recruiting',
    'recruitment',
    'recycling',
    'reduction',
    'reductions',
    'reference',
    'referenced',
    'references',
    'referrals',
    'referring',
    'refinance',
    'reflected',
    'reflection',
    'reflections',
    'refrigerator',
    'refurbished',
    'regarding',
    'regardless',
    'registered',
    'registrar',
    'registration',
    'regression',
    'regularly',
    'regulated',
    'regulation',
    'regulations',
    'regulatory',
    'rehabilitation',
    'relations',
    'relationship',
    'relationships',
    'relatively',
    'relatives',
    'relaxation',
    'relevance',
    'reliability',
    'religions',
    'religious',
    'relocation',
    'remainder',
    'remaining',
    'remarkable',
    'remembered',
    'removable',
    'renaissance',
    'rendering',
    'renewable',
    'replacement',
    'replacing',
    'replication',
    'reporters',
    'reporting',
    'repository',
    'represent',
    'representation',
    'representations',
    'representative',
    'representatives',
    'represented',
    'representing',
    'represents',
    'reproduce',
    'reproduced',
    'reproduction',
    'reproductive',
    'republican',
    'republicans',
    'reputation',
    'requested',
    'requesting',
    'requirement',
    'requirements',
    'requiring',
    'researcher',
    'researchers',
    'reservation',
    'reservations',
    'reservoir',
    'residence',
    'residential',
    'residents',
    'resistance',
    'resistant',
    'resolution',
    'resolutions',
    'resources',
    'respected',
    'respective',
    'respectively',
    'respiratory',
    'responded',
    'respondent',
    'respondents',
    'responding',
    'responses',
    'responsibilities',
    'responsibility',
    'responsible',
    'restaurant',
    'restaurants',
    'restoration',
    'restricted',
    'restriction',
    'restrictions',
    'restructuring',
    'resulting',
    'retailers',
    'retention',
    'retirement',
    'retrieval',
    'retrieved',
    'returning',
    'revelation',
    'reviewing',
    'revisions',
    'revolution',
    'revolutionary',
    'richardson',
    'ringtones',
    'riverside',
    'robertson',
    'rochester',
    'roommates',
    'sacramento',
    'sacrifice',
    'salvation',
    'saskatchewan',
    'satellite',
    'satisfaction',
    'satisfactory',
    'satisfied',
    'scenarios',
    'scheduled',
    'schedules',
    'scheduling',
    'scholarship',
    'scholarships',
    'scientific',
    'scientist',
    'scientists',
    'screening',
    'screensaver',
    'screensavers',
    'screenshot',
    'screenshots',
    'scripting',
    'sculpture',
    'searching',
    'secondary',
    'secretariat',
    'secretary',
    'securities',
    'selecting',
    'selection',
    'selections',
    'selective',
    'semiconductor',
    'sensitive',
    'sensitivity',
    'sentences',
    'separated',
    'separately',
    'separation',
    'september',
    'sequences',
    'seriously',
    'settlement',
    'sexuality',
    'shakespeare',
    'shareholders',
    'shareware',
    'sheffield',
    'shipments',
    'shopzilla',
    'shortcuts',
    'showtimes',
    'signature',
    'signatures',
    'significance',
    'significant',
    'significantly',
    'similarly',
    'simplified',
    'simulation',
    'simulations',
    'simultaneously',
    'singapore',
    'situation',
    'situations',
    'slideshow',
    'smithsonian',
    'snowboard',
    'societies',
    'sociology',
    'solutions',
    'something',
    'sometimes',
    'somewhere',
    'sophisticated',
    'soundtrack',
    'southampton',
    'southeast',
    'southwest',
    'specialist',
    'specialists',
    'specialized',
    'specializing',
    'specially',
    'specialties',
    'specialty',
    'specifically',
    'specification',
    'specifications',
    'specifics',
    'specified',
    'specifies',
    'spectacular',
    'spiritual',
    'spirituality',
    'spokesman',
    'sponsored',
    'sponsorship',
    'spotlight',
    'spreading',
    'springfield',
    'squirting',
    'stability',
    'stainless',
    'stakeholders',
    'standards',
    'standings',
    'starsmerchant',
    'statement',
    'statements',
    'statewide',
    'stationery',
    'statistical',
    'statistics',
    'statutory',
    'stephanie',
    'stockholm',
    'stockings',
    'strategic',
    'strategies',
    'streaming',
    'strengthen',
    'strengthening',
    'strengths',
    'stretched',
    'structural',
    'structure',
    'structured',
    'structures',
    'subcommittee',
    'subdivision',
    'subjective',
    'sublimedirectory',
    'submission',
    'submissions',
    'submitted',
    'submitting',
    'subscribe',
    'subscriber',
    'subscribers',
    'subscription',
    'subscriptions',
    'subsection',
    'subsequent',
    'subsequently',
    'subsidiaries',
    'subsidiary',
    'substance',
    'substances',
    'substantial',
    'substantially',
    'substitute',
    'successful',
    'successfully',
    'suffering',
    'sufficient',
    'sufficiently',
    'suggested',
    'suggesting',
    'suggestion',
    'suggestions',
    'summaries',
    'sunglasses',
    'superintendent',
    'supervision',
    'supervisor',
    'supervisors',
    'supplement',
    'supplemental',
    'supplements',
    'suppliers',
    'supported',
    'supporters',
    'supporting',
    'surprised',
    'surprising',
    'surrounded',
    'surrounding',
    'surveillance',
    'survivors',
    'suspected',
    'suspended',
    'suspension',
    'sustainability',
    'sustainable',
    'sustained',
    'swaziland',
    'switching',
    'switzerland',
    'syllables',
    'symposium',
    'syndicate',
    'syndication',
    'synthesis',
    'synthetic',
    'systematic',
    'technical',
    'technician',
    'technique',
    'techniques',
    'technological',
    'technologies',
    'technology',
    'techrepublic',
    'telecharger',
    'telecommunications',
    'telephone',
    'telephony',
    'telescope',
    'television',
    'televisions',
    'temperature',
    'temperatures',
    'templates',
    'temporarily',
    'temporary',
    'tennessee',
    'terminals',
    'termination',
    'terminology',
    'territories',
    'territory',
    'terrorism',
    'terrorist',
    'terrorists',
    'testament',
    'testimonials',
    'testimony',
    'textbooks',
    'thanksgiving',
    'themselves',
    'theoretical',
    'therapeutic',
    'therapist',
    'thereafter',
    'therefore',
    'thesaurus',
    'thickness',
    'thoroughly',
    'thousands',
    'threatened',
    'threatening',
    'threshold',
    'throughout',
    'thumbnail',
    'thumbnails',
    'thumbzilla',
    'tolerance',
    'tournament',
    'tournaments',
    'trackback',
    'trackbacks',
    'trademark',
    'trademarks',
    'tradition',
    'traditional',
    'traditions',
    'transaction',
    'transactions',
    'transcript',
    'transcription',
    'transcripts',
    'transexual',
    'transexuales',
    'transferred',
    'transfers',
    'transform',
    'transformation',
    'transition',
    'translate',
    'translated',
    'translation',
    'translations',
    'translator',
    'transmission',
    'transmitted',
    'transparency',
    'transparent',
    'transport',
    'transportation',
    'transsexual',
    'travelers',
    'traveling',
    'traveller',
    'travelling',
    'treasurer',
    'treasures',
    'treatment',
    'treatments',
    'tremendous',
    'tripadvisor',
    'troubleshooting',
    'tutorials',
    'typically',
    'ultimately',
    'unauthorized',
    'unavailable',
    'uncertainty',
    'undefined',
    'undergraduate',
    'underground',
    'underline',
    'underlying',
    'understand',
    'understanding',
    'understood',
    'undertake',
    'undertaken',
    'underwear',
    'unemployment',
    'unexpected',
    'unfortunately',
    'uniprotkb',
    'universal',
    'universities',
    'university',
    'unlimited',
    'unnecessary',
    'unsubscribe',
    'upgrading',
    'utilities',
    'utilization',
    'uzbekistan',
    'vacancies',
    'vacations',
    'valentine',
    'validation',
    'valuation',
    'vancouver',
    'variables',
    'variation',
    'variations',
    'varieties',
    'vbulletin',
    'vegetable',
    'vegetables',
    'vegetarian',
    'vegetation',
    'venezuela',
    'verification',
    'verzeichnis',
    'veterinary',
    'vibrators',
    'victorian',
    'vietnamese',
    'viewpicture',
    'violation',
    'violations',
    'virtually',
    'visibility',
    'vocabulary',
    'vocational',
    'volkswagen',
    'volleyball',
    'voluntary',
    'volunteer',
    'volunteers',
    'voyeurweb',
    'vulnerability',
    'vulnerable',
    'wallpaper',
    'wallpapers',
    'warehouse',
    'warranties',
    'washington',
    'waterproof',
    'watershed',
    'webmaster',
    'webmasters',
    'wednesday',
    'wellington',
    'westminster',
    'wholesale',
    'widescreen',
    'widespread',
    'wikipedia',
    'wilderness',
    'wisconsin',
    'withdrawal',
    'witnesses',
    'wonderful',
    'wondering',
    'worcester',
    'wordpress',
    'workforce',
    'workplace',
    'workshops',
    'workstation',
    'worldwide',
    'wrestling',
    'yesterday',
    'yorkshire',
    'yugoslavia',
];

module.exports = dictionary;

},{}],32:[function(require,module,exports){
const   Company = require('../Companies/Company'),
        MissionComputer = require('./MissionComputer'),
        {Password} = require('./Challenges/Password'),
        Encryption = require('./Challenges/Encryption'),
        EventListener = require('../EventListener'),
        validWorldMapPoints = require('../validWorldMapPoints'),
        helpers = require('../Helpers');

const MISSION_STATUSES = {
    UNDERWAY:'underway',
    AVAILABLE:'available',
    COMPLETE:'complete',
    FAILED:'failed'
};


class Mission extends EventListener
{
    /**
     * Any mission is going to involve connecting to another computer belonging to a company and doing something to it
     * @param {Company}    target      The object representing the company you are, in some way, attacking
     * @param {Company}    sponsor     The company sponsoring this hack
     */
    constructor(target, sponsor)
    {
        super();
        this.name = `Hack ${target.name} for ${sponsor.name}`;
        /**
         * @type {Company} the target company being attacked
         */
        this.target = target;
        /**
         * @type {Company} the company sponsoring this mission
         */
        this.sponsor = sponsor;

        // these values are all instantiated later.
        /**
         * @type {number}
         */
        this.difficulty = 0;
        /**
         *
         * @type {MissionComputer}
         */
        this.computer = null;

        /**
         * @type {string} A constant enum value used for state checking
         */
        this.status = MISSION_STATUSES.AVAILABLE;

    }

    setDifficulty(difficulty)
    {
        this.difficulty = difficulty;
    }

    get challenges()
    {
        return this.computer.challenges;
    }

    /**
     * A method to set the computer for this mission.
     * This is kept as a separate method because we only really want the mission to be populated when we take it,
     * not when we're just listing it.
     *
     *
     */
    build()
    {
        if(this.computer)
        {
            return this;
        }

        this.setDifficulty(this.target.securityLevel);

        let serverType = "Server";
        if(this.difficulty > 10)
        {
            serverType = 'Server Farm';
        }
        else if(this.difficulty > 5)
        {
            serverType = 'Cluster';
        }

        this.computer = new MissionComputer(this.target, serverType)
            .setPassword(Password.getPasswordForDifficulty(this.difficulty))
            .setEncryption(new Encryption(this.difficulty))
            .setLocation(helpers.getRandomArrayElement(validWorldMapPoints))
            .on('accessed', ()=>{
                this.signalComplete();
            }).on('connectionStepTraced', (step)=>{
                this.trigger("connectionStepTraced", step);
            }).on('hackTracked', ()=>{
                console.log('Connection traced');
                this.status = MISSION_STATUSES.FAILED;
                this.target.traceHacker();
                this.trigger('hackTracked');
                this.computer.disconnect();
            }).on('updateTracePercentage', (percentage)=>{
                this.trigger('updateTracePercentage', percentage);
            });

        this.status = MISSION_STATUSES.UNDERWAY;
        return this;
    }

    /**
     * @returns {number}
     */
    get reward()
    {
        return Math.pow((this.difficulty * this.computer.difficultyModifier), this.sponsor.playerRespectModifier);
    }

    signalComplete()
    {
        this.status = MISSION_STATUSES.COMPLETE;
        this.sponsor.finishMission(this);
        this.target.increaseSecurityLevel();
        this.trigger('complete');
    }

    set connection(connection)
    {
        this.computer.connect(connection);
    }

    get connection()
    {
        return this.computer.currentPlayerConnection;
    }

    tick()
    {
        if(this.status === MISSION_STATUSES.COMPLETE)
        {
            return;
        }
        this.build();
        this.computer.tick();
    }

    static getNewMission()
    {
        let companies = helpers.shuffleArray([...Company.allCompanies]),
            source = companies.shift(),
            target = companies.shift();
        return new Mission(source, target);
    }
}
module.exports = Mission;

},{"../Companies/Company":7,"../EventListener":25,"../Helpers":27,"../validWorldMapPoints":36,"./Challenges/Encryption":29,"./Challenges/Password":30,"./MissionComputer":33}],33:[function(require,module,exports){
const   MechanicalComputer = require('../Computers/MechanicalComputer');
let  DIFFICULTY_EXPONENT = 1.8;


class MissionComputer extends MechanicalComputer
{
    constructor(company, serverType)
    {
        let name = company.name+' '+serverType;
        super(name, null);
        /**
         * @type {string}
         */
        this.serverType = serverType;
        /**
         * @type {Encryption}   The Encryption this computer has on it
         */
        this.encryption = null;
        /**
         * @type {Password}     The Password this computer has on it
         */
        this.password = null;
        /**
         * Whether or not this computer has been successfully hacked
         * @type {boolean}
         */
        this.accessible = false;
        /**
         * The current connection by which the player accesses this computer
         * @type {Connection}
         */
        this.currentPlayerConnection = null;
        /**
         * Whether or not the administrator of this computer should have been alerted as to the breach
         * @type {boolean}
         */
        this.alerted = false;
        /**
         * The set of all challenges that need to be overcome in order to access this computer
         * @type {Array.<Challenge>}
         */
        this.challenges = [];
        /**
         * We need this reference to determine how much the Mission Computer traces the connection each tick
         */
        this.company = company;
        this.difficultyModifier = 0;
        MissionComputer.computersSpawned++;
    }

    get uniqueID()
    {
        return `${this.name}_${MissionComputer.computersSpawned}`;
    }

    toJSON()
    {
        let json = super.toJSON();
        json.serverType = this.serverType;
    }

    fromJSON(companyJSON, company)
    {
        let computer = new MissionComputer(company, companyJSON.serverType);
        computer.setLocation(companyJSON.location);
    }

    /**
     * @param {Connection} connection
     */
    connect(connection)
    {
        super.connect();
        let clone = connection.clone()
            .setEndPoint(this)
            .reverse()
            .once("connectionTraced", ()=>{
                this.trigger('hackTracked');
            }).on('stepTraced',(step)=>{
                this.trigger('connectionStepTraced', step);
            }).on('updateTracePercentage', (percentage)=>{
                this.trigger('updateTracePercentage', percentage);
            });
        this.currentPlayerConnection = clone;


        if(this.alerted)
        {
            this.startTraceBack();
        }


        return this;
    }

    disconnect()
    {
        super.disconnect();
        this.currentPlayerConnection.close();
        this.stopTraceBack();
        return this;
    }

    reconnect(connection)
    {
        if(connection.equals(this.currentPlayerConnection))
        {
            this.resumeTraceBack();
        }
        else
        {
            this.connect(connection);
        }
        return this;
    }

    addChallenge(challenge)
    {
        challenge
            .setComputer(this)
            .on('solved', ()=>{
                this.updateAccessStatus();
                challenge.off();
            })
            .on('start', ()=>{this.startTraceBack();});

        this.difficultyModifier += challenge.calculatedDifficulty;
        this.challenges.push(challenge);
        this.traceSpeed = Math.pow(this.difficultyModifier, this.company.securityLevel);
    }

    setEncryption(encryption)
    {
        this.encryption = encryption;
        this.addChallenge(encryption);
        return this;
    }

    setPassword(password)
    {
        this.password = password;
        this.addChallenge(password);
        return this;
    }

    updateAccessStatus()
    {
        if(!this.accessible)
        {
            let accessible = true;
            for(let challenge of this.challenges)
            {
                accessible = accessible && challenge.solved;
            }
            this.accessible = accessible;
        }

        if(this.accessible)
        {
            this.trigger('accessed');
        }
        return this.accessible;
    }

    tick()
    {
        if(this.tracingConnection)
        {
            this.currentPlayerConnection.traceStep(this.traceSpeed);
        }
    }

    startTraceBack()
    {
        if(this.tracingConnection)
        {
            return;
        }
        this.currentPlayerConnection.connect();
        this.tracingConnection = true;
    }

    resumeTraceBack()
    {
        this.currentPlayerConnection.reconnect();
        this.tracingConnection = true;
    }

    stopTraceBack()
    {
        this.tracingConnection = false;
    }
}
MissionComputer.computersSpawned = 0;

module.exports = MissionComputer;

},{"../Computers/MechanicalComputer":13}],34:[function(require,module,exports){
const   Mission = require('./Mission'),
        MINIMUM_MISSIONS = 20;
let availableMissions = [];

class MissionGenerator
{
    static updateAvailableMissions()
    {
        while(availableMissions.length < MINIMUM_MISSIONS)
        {
            availableMissions.push(
                Mission.getNewMission()
            );
        }
    }

    static get availableMissions()
    {
        this.updateAvailableMissions();
        return availableMissions;
    }

    static getFirstAvailableMission()
    {
        this.updateAvailableMissions();
        let mission = availableMissions.shift().build();
        this.updateAvailableMissions();
        return mission;
    }
}

module.exports = MissionGenerator;

},{"./Mission":32}],35:[function(require,module,exports){
const EventListener = require('./EventListener');

class Upgradeable extends EventListener
{
    static get upgrades()
    {
        return this.hasOwnProperty('_upgrades')?this._upgrades:void 0;
    }

    static set upgrades(upgrades)
    {
        this._upgrades = upgrades;
    }

    /**
     *
     * @param {Array.<ResearchEffect>} upgradeEffects
     */
    static applyResearchUpgrade(upgradeEffects)
    {
        if(!this.upgrades)
        {
            this.upgrades = [];
        }
        for(let effect of upgradeEffects)
        {
            if(!this.upgrades[effect.property])
            {
                this.upgrades[effect.property] = [];
            }
            this.upgrades[effect.property].push(effect.amount);
        }
        this.trigger('upgrade');
    }
}

module.exports = Upgradeable;

},{"./EventListener":25}],36:[function(require,module,exports){
module.exports = [{"x":386,"y":6,"color":15797228},{"x":402,"y":10,"color":15797228},{"x":390,"y":13,"color":15797228},{"x":379,"y":16,"color":15797228},{"x":407,"y":19,"color":15797228},{"x":381,"y":21,"color":15797228},{"x":271,"y":23,"color":15797228},{"x":361,"y":24,"color":15797228},{"x":377,"y":25,"color":15797228},{"x":396,"y":26,"color":15797228},{"x":405,"y":27,"color":15797228},{"x":414,"y":28,"color":15797228},{"x":413,"y":29,"color":15797228},{"x":401,"y":30,"color":15797228},{"x":382,"y":31,"color":15797228},{"x":359,"y":32,"color":15797228},{"x":290,"y":33,"color":15797228},{"x":263,"y":34,"color":15797228},{"x":406,"y":34,"color":15797228},{"x":370,"y":35,"color":15797228},{"x":292,"y":36,"color":15797228},{"x":257,"y":37,"color":15797228},{"x":394,"y":37,"color":15797228},{"x":353,"y":38,"color":15797228},{"x":283,"y":39,"color":15797228},{"x":257,"y":40,"color":15797228},{"x":393,"y":40,"color":15797228},{"x":374,"y":41,"color":15797228},{"x":342,"y":42,"color":15797228},{"x":298,"y":43,"color":15797228},{"x":254,"y":44,"color":15797228},{"x":383,"y":44,"color":15797228},{"x":321,"y":45,"color":15797228},{"x":255,"y":46,"color":15797228},{"x":380,"y":46,"color":15797228},{"x":293,"y":47,"color":15797228},{"x":422,"y":47,"color":15797228},{"x":333,"y":48,"color":15797228},{"x":242,"y":49,"color":15797228},{"x":365,"y":49,"color":15797228},{"x":268,"y":50,"color":15797228},{"x":400,"y":50,"color":15797228},{"x":321,"y":51,"color":15797228},{"x":446,"y":51,"color":15797228},{"x":356,"y":52,"color":15797228},{"x":257,"y":53,"color":15797228},{"x":376,"y":53,"color":15797228},{"x":274,"y":54,"color":15797228},{"x":392,"y":54,"color":15797228},{"x":288,"y":55,"color":15797228},{"x":410,"y":55,"color":15797228},{"x":315,"y":56,"color":15797228},{"x":417,"y":56,"color":15797228},{"x":314,"y":57,"color":15797228},{"x":416,"y":57,"color":15797228},{"x":325,"y":58,"color":15797228},{"x":429,"y":58,"color":15797228},{"x":333,"y":59,"color":15797228},{"x":437,"y":59,"color":15797228},{"x":340,"y":60,"color":15797228},{"x":443,"y":60,"color":15797228},{"x":348,"y":61,"color":15797228},{"x":755,"y":61,"color":15797228},{"x":350,"y":62,"color":15797228},{"x":753,"y":62,"color":15797228},{"x":338,"y":63,"color":15797228},{"x":441,"y":63,"color":15797228},{"x":327,"y":64,"color":15797228},{"x":429,"y":64,"color":15797228},{"x":314,"y":65,"color":15797228},{"x":414,"y":65,"color":15797228},{"x":286,"y":66,"color":15797228},{"x":397,"y":66,"color":15797228},{"x":265,"y":67,"color":15797228},{"x":374,"y":67,"color":15797228},{"x":223,"y":68,"color":15797228},{"x":356,"y":68,"color":15797228},{"x":759,"y":68,"color":15797228},{"x":353,"y":69,"color":15797228},{"x":220,"y":70,"color":15797228},{"x":366,"y":70,"color":15797228},{"x":257,"y":71,"color":15797228},{"x":368,"y":71,"color":15797228},{"x":259,"y":72,"color":15797228},{"x":369,"y":72,"color":15797228},{"x":227,"y":73,"color":15797228},{"x":358,"y":73,"color":15797228},{"x":213,"y":74,"color":15797228},{"x":340,"y":74,"color":15797228},{"x":621,"y":74,"color":15797228},{"x":318,"y":75,"color":15797228},{"x":418,"y":75,"color":15797228},{"x":295,"y":76,"color":15797228},{"x":396,"y":76,"color":15797228},{"x":269,"y":77,"color":15797228},{"x":386,"y":77,"color":15797228},{"x":258,"y":78,"color":15797228},{"x":381,"y":78,"color":15797228},{"x":244,"y":79,"color":15797228},{"x":365,"y":79,"color":15797228},{"x":212,"y":80,"color":15797228},{"x":342,"y":80,"color":15797228},{"x":548,"y":80,"color":15797228},{"x":312,"y":81,"color":15797228},{"x":412,"y":81,"color":15797228},{"x":248,"y":82,"color":15797228},{"x":376,"y":82,"color":15797228},{"x":202,"y":83,"color":15797228},{"x":344,"y":83,"color":15797228},{"x":552,"y":83,"color":15797228},{"x":323,"y":84,"color":15797228},{"x":423,"y":84,"color":15797228},{"x":313,"y":85,"color":15797228},{"x":413,"y":85,"color":15797228},{"x":268,"y":86,"color":15797228},{"x":394,"y":86,"color":15797228},{"x":244,"y":87,"color":15797228},{"x":376,"y":87,"color":15797228},{"x":215,"y":88,"color":15797228},{"x":356,"y":88,"color":15797228},{"x":556,"y":88,"color":15797228},{"x":341,"y":89,"color":15797228},{"x":532,"y":89,"color":15797228},{"x":334,"y":90,"color":15797228},{"x":521,"y":90,"color":15797228},{"x":329,"y":91,"color":15797228},{"x":518,"y":91,"color":15797228},{"x":327,"y":92,"color":15797228},{"x":516,"y":92,"color":15797228},{"x":325,"y":93,"color":15797228},{"x":425,"y":93,"color":15797228},{"x":316,"y":94,"color":15797228},{"x":416,"y":94,"color":15797228},{"x":301,"y":95,"color":15797228},{"x":401,"y":95,"color":15797228},{"x":293,"y":96,"color":15797228},{"x":393,"y":96,"color":15797228},{"x":263,"y":97,"color":15797228},{"x":386,"y":97,"color":15797228},{"x":249,"y":98,"color":15797228},{"x":367,"y":98,"color":15797228},{"x":220,"y":99,"color":15797228},{"x":342,"y":99,"color":15797228},{"x":538,"y":99,"color":15797228},{"x":304,"y":100,"color":15797228},{"x":404,"y":100,"color":15797228},{"x":266,"y":101,"color":15797228},{"x":378,"y":101,"color":15797228},{"x":237,"y":102,"color":15797228},{"x":353,"y":102,"color":15797228},{"x":169,"y":103,"color":15797228},{"x":314,"y":103,"color":15797228},{"x":414,"y":103,"color":15797228},{"x":278,"y":104,"color":15797228},{"x":378,"y":104,"color":15797228},{"x":251,"y":105,"color":15797228},{"x":360,"y":105,"color":15797228},{"x":224,"y":106,"color":15797228},{"x":352,"y":106,"color":15797228},{"x":245,"y":107,"color":15797228},{"x":358,"y":107,"color":15797228},{"x":259,"y":108,"color":15797228},{"x":369,"y":108,"color":15797228},{"x":259,"y":109,"color":15797228},{"x":370,"y":109,"color":15797228},{"x":258,"y":110,"color":15797228},{"x":377,"y":110,"color":15797228},{"x":295,"y":111,"color":15797228},{"x":395,"y":111,"color":15797228},{"x":314,"y":112,"color":15797228},{"x":414,"y":112,"color":15797228},{"x":331,"y":113,"color":15797228},{"x":546,"y":113,"color":15797228},{"x":351,"y":114,"color":15797228},{"x":214,"y":115,"color":15797228},{"x":367,"y":115,"color":15797228},{"x":297,"y":116,"color":15797228},{"x":397,"y":116,"color":15797228},{"x":330,"y":117,"color":15797228},{"x":529,"y":117,"color":15797228},{"x":357,"y":118,"color":15797228},{"x":243,"y":119,"color":15797228},{"x":386,"y":119,"color":15797228},{"x":309,"y":120,"color":15797228},{"x":409,"y":120,"color":15797228},{"x":326,"y":121,"color":15797228},{"x":426,"y":121,"color":15797228},{"x":329,"y":122,"color":15797228},{"x":429,"y":122,"color":15797228},{"x":332,"y":123,"color":15797228},{"x":775,"y":123,"color":15797228},{"x":327,"y":124,"color":15797228},{"x":530,"y":124,"color":15797228},{"x":310,"y":125,"color":15797228},{"x":410,"y":125,"color":15797228},{"x":306,"y":126,"color":15797228},{"x":406,"y":126,"color":15797228},{"x":312,"y":127,"color":15797228},{"x":412,"y":127,"color":15797228},{"x":309,"y":128,"color":15797228},{"x":409,"y":128,"color":15797228},{"x":306,"y":129,"color":15797228},{"x":406,"y":129,"color":15797228},{"x":292,"y":130,"color":15797228},{"x":394,"y":130,"color":15797228},{"x":224,"y":131,"color":15797228},{"x":389,"y":131,"color":15797228},{"x":205,"y":132,"color":15797228},{"x":397,"y":132,"color":15797228},{"x":289,"y":133,"color":15797228},{"x":408,"y":133,"color":15797228},{"x":314,"y":134,"color":15797228},{"x":414,"y":134,"color":15797228},{"x":223,"y":135,"color":15797228},{"x":414,"y":135,"color":15797228},{"x":205,"y":136,"color":15797228},{"x":411,"y":136,"color":15797228},{"x":182,"y":137,"color":15797228},{"x":399,"y":137,"color":15797228},{"x":806,"y":137,"color":15797228},{"x":363,"y":138,"color":15797228},{"x":769,"y":138,"color":15797228},{"x":323,"y":139,"color":15797228},{"x":425,"y":139,"color":15797228},{"x":164,"y":140,"color":15797228},{"x":378,"y":140,"color":15797228},{"x":783,"y":140,"color":15797228},{"x":249,"y":141,"color":15797228},{"x":413,"y":141,"color":15797228},{"x":887,"y":141,"color":15797228},{"x":335,"y":142,"color":15797228},{"x":738,"y":142,"color":15797228},{"x":165,"y":143,"color":15797228},{"x":356,"y":143,"color":15797228},{"x":756,"y":143,"color":15797228},{"x":201,"y":144,"color":15797228},{"x":375,"y":144,"color":15797228},{"x":778,"y":144,"color":15797228},{"x":242,"y":145,"color":15797228},{"x":407,"y":145,"color":15797228},{"x":883,"y":145,"color":15797228},{"x":357,"y":146,"color":15797228},{"x":761,"y":146,"color":15797228},{"x":247,"y":147,"color":15797228},{"x":414,"y":147,"color":15797228},{"x":213,"y":148,"color":15797228},{"x":392,"y":148,"color":15797228},{"x":796,"y":148,"color":15797228},{"x":373,"y":149,"color":15797228},{"x":776,"y":149,"color":15797228},{"x":373,"y":150,"color":15797228},{"x":786,"y":150,"color":15797228},{"x":400,"y":151,"color":15797228},{"x":331,"y":152,"color":15797228},{"x":734,"y":152,"color":15797228},{"x":356,"y":153,"color":15797228},{"x":758,"y":153,"color":15797228},{"x":381,"y":154,"color":15797228},{"x":785,"y":154,"color":15797228},{"x":395,"y":155,"color":15797228},{"x":136,"y":156,"color":15797228},{"x":406,"y":156,"color":15797228},{"x":204,"y":157,"color":15797228},{"x":417,"y":157,"color":15797228},{"x":224,"y":158,"color":15797228},{"x":643,"y":158,"color":15797228},{"x":225,"y":159,"color":15797228},{"x":645,"y":159,"color":15797228},{"x":203,"y":160,"color":15797228},{"x":399,"y":160,"color":15797228},{"x":140,"y":161,"color":15797228},{"x":367,"y":161,"color":15797228},{"x":764,"y":161,"color":15797228},{"x":237,"y":162,"color":15797228},{"x":410,"y":162,"color":15797228},{"x":817,"y":162,"color":15797228},{"x":340,"y":163,"color":15797228},{"x":741,"y":163,"color":15797228},{"x":146,"y":164,"color":15797228},{"x":375,"y":164,"color":15797228},{"x":781,"y":164,"color":15797228},{"x":250,"y":165,"color":15797228},{"x":686,"y":165,"color":15797228},{"x":836,"y":165,"color":15797228},{"x":345,"y":166,"color":15797228},{"x":746,"y":166,"color":15797228},{"x":142,"y":167,"color":15797228},{"x":370,"y":167,"color":15797228},{"x":767,"y":167,"color":15797228},{"x":182,"y":168,"color":15797228},{"x":390,"y":168,"color":15797228},{"x":789,"y":168,"color":15797228},{"x":205,"y":169,"color":15797228},{"x":405,"y":169,"color":15797228},{"x":795,"y":169,"color":15797228},{"x":202,"y":170,"color":15797228},{"x":397,"y":170,"color":15797228},{"x":780,"y":170,"color":15797228},{"x":165,"y":171,"color":15797228},{"x":374,"y":171,"color":15797228},{"x":756,"y":171,"color":15797228},{"x":131,"y":172,"color":15797228},{"x":342,"y":172,"color":15797228},{"x":727,"y":172,"color":15797228},{"x":827,"y":172,"color":15797228},{"x":245,"y":173,"color":15797228},{"x":680,"y":173,"color":15797228},{"x":805,"y":173,"color":15797228},{"x":182,"y":174,"color":15797228},{"x":393,"y":174,"color":15797228},{"x":777,"y":174,"color":15797228},{"x":147,"y":175,"color":15797228},{"x":364,"y":175,"color":15797228},{"x":749,"y":175,"color":15797228},{"x":884,"y":175,"color":15797228},{"x":333,"y":176,"color":15797228},{"x":688,"y":176,"color":15797228},{"x":810,"y":176,"color":15797228},{"x":171,"y":177,"color":15797228},{"x":380,"y":177,"color":15797228},{"x":755,"y":177,"color":15797228},{"x":888,"y":177,"color":15797228},{"x":263,"y":178,"color":15797228},{"x":679,"y":178,"color":15797228},{"x":796,"y":178,"color":15797228},{"x":163,"y":179,"color":15797228},{"x":369,"y":179,"color":15797228},{"x":735,"y":179,"color":15797228},{"x":835,"y":179,"color":15797228},{"x":245,"y":180,"color":15797228},{"x":417,"y":180,"color":15797228},{"x":774,"y":180,"color":15797228},{"x":905,"y":180,"color":15797228},{"x":349,"y":181,"color":15797228},{"x":721,"y":181,"color":15797228},{"x":821,"y":181,"color":15797228},{"x":181,"y":182,"color":15797228},{"x":384,"y":182,"color":15797228},{"x":747,"y":182,"color":15797228},{"x":847,"y":182,"color":15797228},{"x":235,"y":183,"color":15797228},{"x":402,"y":183,"color":15797228},{"x":767,"y":183,"color":15797228},{"x":878,"y":183,"color":15797228},{"x":250,"y":184,"color":15797228},{"x":417,"y":184,"color":15797228},{"x":776,"y":184,"color":15797228},{"x":884,"y":184,"color":15797228},{"x":252,"y":185,"color":15797228},{"x":641,"y":185,"color":15797228},{"x":779,"y":185,"color":15797228},{"x":884,"y":185,"color":15797228},{"x":241,"y":186,"color":15797228},{"x":402,"y":186,"color":15797228},{"x":765,"y":186,"color":15797228},{"x":870,"y":186,"color":15797228},{"x":184,"y":187,"color":15797228},{"x":379,"y":187,"color":15797228},{"x":737,"y":187,"color":15797228},{"x":837,"y":187,"color":15797228},{"x":38,"y":188,"color":15797228},{"x":330,"y":188,"color":15797228},{"x":704,"y":188,"color":15797228},{"x":804,"y":188,"color":15797228},{"x":905,"y":188,"color":15797228},{"x":248,"y":189,"color":15797228},{"x":400,"y":189,"color":15797228},{"x":768,"y":189,"color":15797228},{"x":868,"y":189,"color":15797228},{"x":174,"y":190,"color":15797228},{"x":365,"y":190,"color":15797228},{"x":735,"y":190,"color":15797228},{"x":835,"y":190,"color":15797228},{"x":935,"y":190,"color":15797228},{"x":269,"y":191,"color":15797228},{"x":679,"y":191,"color":15797228},{"x":784,"y":191,"color":15797228},{"x":884,"y":191,"color":15797228},{"x":162,"y":192,"color":15797228},{"x":354,"y":192,"color":15797228},{"x":712,"y":192,"color":15797228},{"x":812,"y":192,"color":15797228},{"x":912,"y":192,"color":15797228},{"x":177,"y":193,"color":15797228},{"x":374,"y":193,"color":15797228},{"x":730,"y":193,"color":15797228},{"x":830,"y":193,"color":15797228},{"x":930,"y":193,"color":15797228},{"x":185,"y":194,"color":15797228},{"x":388,"y":194,"color":15797228},{"x":735,"y":194,"color":15797228},{"x":835,"y":194,"color":15797228},{"x":935,"y":194,"color":15797228},{"x":182,"y":195,"color":15797228},{"x":393,"y":195,"color":15797228},{"x":736,"y":195,"color":15797228},{"x":836,"y":195,"color":15797228},{"x":936,"y":195,"color":15797228},{"x":169,"y":196,"color":15797228},{"x":381,"y":196,"color":15797228},{"x":717,"y":196,"color":15797228},{"x":817,"y":196,"color":15797228},{"x":917,"y":196,"color":15797228},{"x":115,"y":197,"color":15797228},{"x":353,"y":197,"color":15797228},{"x":679,"y":197,"color":15797228},{"x":783,"y":197,"color":15797228},{"x":883,"y":197,"color":15797228},{"x":44,"y":198,"color":15797228},{"x":207,"y":198,"color":15797228},{"x":411,"y":198,"color":15797228},{"x":742,"y":198,"color":15797228},{"x":842,"y":198,"color":15797228},{"x":942,"y":198,"color":15797228},{"x":87,"y":199,"color":15797228},{"x":341,"y":199,"color":15797228},{"x":576,"y":199,"color":15797228},{"x":769,"y":199,"color":15797228},{"x":869,"y":199,"color":15797228},{"x":977,"y":199,"color":15797228},{"x":122,"y":200,"color":15797228},{"x":354,"y":200,"color":15797228},{"x":659,"y":200,"color":15797228},{"x":776,"y":200,"color":15797228},{"x":876,"y":200,"color":15797228},{"x":985,"y":200,"color":15797228},{"x":124,"y":201,"color":15797228},{"x":350,"y":201,"color":15797228},{"x":625,"y":201,"color":15797228},{"x":779,"y":201,"color":15797228},{"x":879,"y":201,"color":15797228},{"x":986,"y":201,"color":15797228},{"x":121,"y":202,"color":15797228},{"x":350,"y":202,"color":15797228},{"x":622,"y":202,"color":15797228},{"x":778,"y":202,"color":15797228},{"x":878,"y":202,"color":15797228},{"x":984,"y":202,"color":15797228},{"x":115,"y":203,"color":15797228},{"x":347,"y":203,"color":15797228},{"x":584,"y":203,"color":15797228},{"x":770,"y":203,"color":15797228},{"x":870,"y":203,"color":15797228},{"x":974,"y":203,"color":15797228},{"x":92,"y":204,"color":15797228},{"x":251,"y":204,"color":15797228},{"x":559,"y":204,"color":15797228},{"x":740,"y":204,"color":15797228},{"x":840,"y":204,"color":15797228},{"x":940,"y":204,"color":15797228},{"x":55,"y":205,"color":15797228},{"x":157,"y":205,"color":15797228},{"x":396,"y":205,"color":15797228},{"x":699,"y":205,"color":15797228},{"x":802,"y":205,"color":15797228},{"x":902,"y":205,"color":15797228},{"x":14,"y":206,"color":15797228},{"x":116,"y":206,"color":15797228},{"x":354,"y":206,"color":15797228},{"x":636,"y":206,"color":15797228},{"x":754,"y":206,"color":15797228},{"x":854,"y":206,"color":15797228},{"x":954,"y":206,"color":15797228},{"x":66,"y":207,"color":15797228},{"x":223,"y":207,"color":15797228},{"x":550,"y":207,"color":15797228},{"x":707,"y":207,"color":15797228},{"x":807,"y":207,"color":15797228},{"x":907,"y":207,"color":15797228},{"x":19,"y":208,"color":15797228},{"x":121,"y":208,"color":15797228},{"x":355,"y":208,"color":15797228},{"x":614,"y":208,"color":15797228},{"x":743,"y":208,"color":15797228},{"x":843,"y":208,"color":15797228},{"x":943,"y":208,"color":15797228},{"x":57,"y":209,"color":15797228},{"x":184,"y":209,"color":15797228},{"x":387,"y":209,"color":15797228},{"x":659,"y":209,"color":15797228},{"x":767,"y":209,"color":15797228},{"x":867,"y":209,"color":15797228},{"x":967,"y":209,"color":15797228},{"x":80,"y":210,"color":15797228},{"x":226,"y":210,"color":15797228},{"x":543,"y":210,"color":15797228},{"x":670,"y":210,"color":15797228},{"x":777,"y":210,"color":15797228},{"x":877,"y":210,"color":15797228},{"x":977,"y":210,"color":15797228},{"x":91,"y":211,"color":15797228},{"x":231,"y":211,"color":15797228},{"x":548,"y":211,"color":15797228},{"x":674,"y":211,"color":15797228},{"x":782,"y":211,"color":15797228},{"x":882,"y":211,"color":15797228},{"x":982,"y":211,"color":15797228},{"x":96,"y":212,"color":15797228},{"x":219,"y":212,"color":15797228},{"x":532,"y":212,"color":15797228},{"x":656,"y":212,"color":15797228},{"x":768,"y":212,"color":15797228},{"x":868,"y":212,"color":15797228},{"x":968,"y":212,"color":15797228},{"x":80,"y":213,"color":15797228},{"x":186,"y":213,"color":15797228},{"x":352,"y":213,"color":15797228},{"x":596,"y":213,"color":15797228},{"x":725,"y":213,"color":15797228},{"x":825,"y":213,"color":15797228},{"x":925,"y":213,"color":15797228},{"x":36,"y":214,"color":15797228},{"x":138,"y":214,"color":15797228},{"x":250,"y":214,"color":15797228},{"x":548,"y":214,"color":15797228},{"x":671,"y":214,"color":15797228},{"x":776,"y":214,"color":15797228},{"x":876,"y":214,"color":15797228},{"x":976,"y":214,"color":15797228},{"x":89,"y":215,"color":15797228},{"x":193,"y":215,"color":15797228},{"x":360,"y":215,"color":15797228},{"x":623,"y":215,"color":15797228},{"x":729,"y":215,"color":15797228},{"x":829,"y":215,"color":15797228},{"x":929,"y":215,"color":15797228},{"x":40,"y":216,"color":15797228},{"x":142,"y":216,"color":15797228},{"x":245,"y":216,"color":15797228},{"x":547,"y":216,"color":15797228},{"x":669,"y":216,"color":15797228},{"x":776,"y":216,"color":15797228},{"x":876,"y":216,"color":15797228},{"x":976,"y":216,"color":15797228},{"x":95,"y":217,"color":15797228},{"x":204,"y":217,"color":15797228},{"x":365,"y":217,"color":15797228},{"x":627,"y":217,"color":15797228},{"x":734,"y":217,"color":15797228},{"x":834,"y":217,"color":15797228},{"x":934,"y":217,"color":15797228},{"x":48,"y":218,"color":15797228},{"x":158,"y":218,"color":15797228},{"x":293,"y":218,"color":15797228},{"x":571,"y":218,"color":15797228},{"x":703,"y":218,"color":15797228},{"x":803,"y":218,"color":15797228},{"x":903,"y":218,"color":15797228},{"x":1005,"y":218,"color":15797228},{"x":116,"y":219,"color":15797228},{"x":228,"y":219,"color":15797228},{"x":530,"y":219,"color":15797228},{"x":649,"y":219,"color":15797228},{"x":763,"y":219,"color":15797228},{"x":863,"y":219,"color":15797228},{"x":963,"y":219,"color":15797228},{"x":78,"y":220,"color":15797228},{"x":196,"y":220,"color":15797228},{"x":361,"y":220,"color":15797228},{"x":623,"y":220,"color":15797228},{"x":735,"y":220,"color":15797228},{"x":835,"y":220,"color":15797228},{"x":935,"y":220,"color":15797228},{"x":46,"y":221,"color":15797228},{"x":163,"y":221,"color":15797228},{"x":337,"y":221,"color":15797228},{"x":589,"y":221,"color":15797228},{"x":709,"y":221,"color":15797228},{"x":809,"y":221,"color":15797228},{"x":909,"y":221,"color":15797228},{"x":1014,"y":221,"color":15797228},{"x":116,"y":222,"color":15797228},{"x":275,"y":222,"color":15797228},{"x":561,"y":222,"color":15797228},{"x":691,"y":222,"color":15797228},{"x":791,"y":222,"color":15797228},{"x":891,"y":222,"color":15797228},{"x":991,"y":222,"color":15797228},{"x":101,"y":223,"color":15797228},{"x":221,"y":223,"color":15797228},{"x":543,"y":223,"color":15797228},{"x":669,"y":223,"color":15797228},{"x":769,"y":223,"color":15797228},{"x":869,"y":223,"color":15797228},{"x":969,"y":223,"color":15797228},{"x":67,"y":224,"color":15797228},{"x":188,"y":224,"color":15797228},{"x":367,"y":224,"color":15797228},{"x":629,"y":224,"color":15797228},{"x":729,"y":224,"color":15797228},{"x":829,"y":224,"color":15797228},{"x":929,"y":224,"color":15797228},{"x":20,"y":225,"color":15797228},{"x":122,"y":225,"color":15797228},{"x":276,"y":225,"color":15797228},{"x":555,"y":225,"color":15797228},{"x":675,"y":225,"color":15797228},{"x":775,"y":225,"color":15797228},{"x":875,"y":225,"color":15797228},{"x":975,"y":225,"color":15797228},{"x":65,"y":226,"color":15797228},{"x":180,"y":226,"color":15797228},{"x":361,"y":226,"color":15797228},{"x":620,"y":226,"color":15797228},{"x":720,"y":226,"color":15797228},{"x":820,"y":226,"color":15797228},{"x":920,"y":226,"color":15797228},{"x":12,"y":227,"color":15797228},{"x":114,"y":227,"color":15797228},{"x":227,"y":227,"color":15797228},{"x":545,"y":227,"color":15797228},{"x":672,"y":227,"color":15797228},{"x":772,"y":227,"color":15797228},{"x":872,"y":227,"color":15797228},{"x":972,"y":227,"color":15797228},{"x":70,"y":228,"color":15797228},{"x":182,"y":228,"color":15797228},{"x":369,"y":228,"color":15797228},{"x":628,"y":228,"color":15797228},{"x":728,"y":228,"color":15797228},{"x":828,"y":228,"color":15797228},{"x":928,"y":228,"color":15797228},{"x":35,"y":229,"color":15797228},{"x":147,"y":229,"color":15797228},{"x":283,"y":229,"color":15797228},{"x":565,"y":229,"color":15797228},{"x":684,"y":229,"color":15797228},{"x":784,"y":229,"color":15797228},{"x":884,"y":229,"color":15797228},{"x":984,"y":229,"color":15797228},{"x":91,"y":230,"color":15797228},{"x":202,"y":230,"color":15797228},{"x":422,"y":230,"color":15797228},{"x":628,"y":230,"color":15797228},{"x":728,"y":230,"color":15797228},{"x":828,"y":230,"color":15797228},{"x":928,"y":230,"color":15797228},{"x":38,"y":231,"color":15797228},{"x":149,"y":231,"color":15797228},{"x":268,"y":231,"color":15797228},{"x":558,"y":231,"color":15797228},{"x":675,"y":231,"color":15797228},{"x":775,"y":231,"color":15797228},{"x":875,"y":231,"color":15797228},{"x":975,"y":231,"color":15797228},{"x":91,"y":232,"color":15797228},{"x":193,"y":232,"color":15797228},{"x":359,"y":232,"color":15797228},{"x":615,"y":232,"color":15797228},{"x":715,"y":232,"color":15797228},{"x":815,"y":232,"color":15797228},{"x":915,"y":232,"color":15797228},{"x":37,"y":233,"color":15797228},{"x":139,"y":233,"color":15797228},{"x":243,"y":233,"color":15797228},{"x":537,"y":233,"color":15797228},{"x":660,"y":233,"color":15797228},{"x":760,"y":233,"color":15797228},{"x":860,"y":233,"color":15797228},{"x":960,"y":233,"color":15797228},{"x":99,"y":234,"color":15797228},{"x":199,"y":234,"color":15797228},{"x":366,"y":234,"color":15797228},{"x":616,"y":234,"color":15797228},{"x":716,"y":234,"color":15797228},{"x":816,"y":234,"color":15797228},{"x":916,"y":234,"color":15797228},{"x":54,"y":235,"color":15797228},{"x":156,"y":235,"color":15797228},{"x":283,"y":235,"color":15797228},{"x":567,"y":235,"color":15797228},{"x":678,"y":235,"color":15797228},{"x":778,"y":235,"color":15797228},{"x":878,"y":235,"color":15797228},{"x":978,"y":235,"color":15797228},{"x":119,"y":236,"color":15797228},{"x":219,"y":236,"color":15797228},{"x":530,"y":236,"color":15797228},{"x":645,"y":236,"color":15797228},{"x":745,"y":236,"color":15797228},{"x":845,"y":236,"color":15797228},{"x":945,"y":236,"color":15797228},{"x":85,"y":237,"color":15797228},{"x":185,"y":237,"color":15797228},{"x":426,"y":237,"color":15797228},{"x":623,"y":237,"color":15797228},{"x":723,"y":237,"color":15797228},{"x":823,"y":237,"color":15797228},{"x":923,"y":237,"color":15797228},{"x":59,"y":238,"color":15797228},{"x":161,"y":238,"color":15797228},{"x":347,"y":238,"color":15797228},{"x":596,"y":238,"color":15797228},{"x":696,"y":238,"color":15797228},{"x":796,"y":238,"color":15797228},{"x":896,"y":238,"color":15797228},{"x":31,"y":239,"color":15797228},{"x":133,"y":239,"color":15797228},{"x":254,"y":239,"color":15797228},{"x":575,"y":239,"color":15797228},{"x":676,"y":239,"color":15797228},{"x":776,"y":239,"color":15797228},{"x":876,"y":239,"color":15797228},{"x":976,"y":239,"color":15797228},{"x":113,"y":240,"color":15797228},{"x":213,"y":240,"color":15797228},{"x":568,"y":240,"color":15797228},{"x":669,"y":240,"color":15797228},{"x":769,"y":240,"color":15797228},{"x":869,"y":240,"color":15797228},{"x":969,"y":240,"color":15797228},{"x":105,"y":241,"color":15797228},{"x":205,"y":241,"color":15797228},{"x":574,"y":241,"color":15797228},{"x":674,"y":241,"color":15797228},{"x":774,"y":241,"color":15797228},{"x":874,"y":241,"color":15797228},{"x":974,"y":241,"color":15797228},{"x":102,"y":242,"color":15797228},{"x":202,"y":242,"color":15797228},{"x":560,"y":242,"color":15797228},{"x":662,"y":242,"color":15797228},{"x":762,"y":242,"color":15797228},{"x":862,"y":242,"color":15797228},{"x":962,"y":242,"color":15797228},{"x":90,"y":243,"color":15797228},{"x":190,"y":243,"color":15797228},{"x":553,"y":243,"color":15797228},{"x":655,"y":243,"color":15797228},{"x":755,"y":243,"color":15797228},{"x":855,"y":243,"color":15797228},{"x":955,"y":243,"color":15797228},{"x":80,"y":244,"color":15797228},{"x":185,"y":244,"color":15797228},{"x":550,"y":244,"color":15797228},{"x":652,"y":244,"color":15797228},{"x":752,"y":244,"color":15797228},{"x":852,"y":244,"color":15797228},{"x":952,"y":244,"color":15797228},{"x":76,"y":245,"color":15797228},{"x":188,"y":245,"color":15797228},{"x":559,"y":245,"color":15797228},{"x":660,"y":245,"color":15797228},{"x":760,"y":245,"color":15797228},{"x":860,"y":245,"color":15797228},{"x":960,"y":245,"color":15797228},{"x":85,"y":246,"color":15797228},{"x":197,"y":246,"color":15797228},{"x":568,"y":246,"color":15797228},{"x":669,"y":246,"color":15797228},{"x":769,"y":246,"color":15797228},{"x":869,"y":246,"color":15797228},{"x":972,"y":246,"color":15797228},{"x":96,"y":247,"color":15797228},{"x":208,"y":247,"color":15797228},{"x":581,"y":247,"color":15797228},{"x":681,"y":247,"color":15797228},{"x":781,"y":247,"color":15797228},{"x":881,"y":247,"color":15797228},{"x":14,"y":248,"color":15797228},{"x":116,"y":248,"color":15797228},{"x":274,"y":248,"color":15797228},{"x":594,"y":248,"color":15797228},{"x":694,"y":248,"color":15797228},{"x":794,"y":248,"color":15797228},{"x":894,"y":248,"color":15797228},{"x":27,"y":249,"color":15797228},{"x":129,"y":249,"color":15797228},{"x":351,"y":249,"color":15797228},{"x":609,"y":249,"color":15797228},{"x":709,"y":249,"color":15797228},{"x":809,"y":249,"color":15797228},{"x":909,"y":249,"color":15797228},{"x":42,"y":250,"color":15797228},{"x":144,"y":250,"color":15797228},{"x":504,"y":250,"color":15797228},{"x":620,"y":250,"color":15797228},{"x":720,"y":250,"color":15797228},{"x":820,"y":250,"color":15797228},{"x":920,"y":250,"color":15797228},{"x":55,"y":251,"color":15797228},{"x":167,"y":251,"color":15797228},{"x":522,"y":251,"color":15797228},{"x":637,"y":251,"color":15797228},{"x":737,"y":251,"color":15797228},{"x":837,"y":251,"color":15797228},{"x":943,"y":251,"color":15797228},{"x":80,"y":252,"color":15797228},{"x":193,"y":252,"color":15797228},{"x":561,"y":252,"color":15797228},{"x":665,"y":252,"color":15797228},{"x":765,"y":252,"color":15797228},{"x":865,"y":252,"color":15797228},{"x":17,"y":253,"color":15797228},{"x":120,"y":253,"color":15797228},{"x":299,"y":253,"color":15797228},{"x":606,"y":253,"color":15797228},{"x":706,"y":253,"color":15797228},{"x":806,"y":253,"color":15797228},{"x":906,"y":253,"color":15797228},{"x":61,"y":254,"color":15797228},{"x":176,"y":254,"color":15797228},{"x":550,"y":254,"color":15797228},{"x":658,"y":254,"color":15797228},{"x":758,"y":254,"color":15797228},{"x":858,"y":254,"color":15797228},{"x":15,"y":255,"color":15797228},{"x":123,"y":255,"color":15797228},{"x":348,"y":255,"color":15797228},{"x":623,"y":255,"color":15797228},{"x":723,"y":255,"color":15797228},{"x":823,"y":255,"color":15797228},{"x":923,"y":255,"color":15797228},{"x":100,"y":256,"color":15797228},{"x":209,"y":256,"color":15797228},{"x":596,"y":256,"color":15797228},{"x":696,"y":256,"color":15797228},{"x":796,"y":256,"color":15797228},{"x":896,"y":256,"color":15797228},{"x":79,"y":257,"color":15797228},{"x":186,"y":257,"color":15797228},{"x":558,"y":257,"color":15797228},{"x":667,"y":257,"color":15797228},{"x":767,"y":257,"color":15797228},{"x":867,"y":257,"color":15797228},{"x":36,"y":258,"color":15797228},{"x":150,"y":258,"color":15797228},{"x":512,"y":258,"color":15797228},{"x":635,"y":258,"color":15797228},{"x":735,"y":258,"color":15797228},{"x":835,"y":258,"color":15797228},{"x":957,"y":258,"color":15797228},{"x":118,"y":259,"color":15797228},{"x":268,"y":259,"color":15797228},{"x":615,"y":259,"color":15797228},{"x":715,"y":259,"color":15797228},{"x":815,"y":259,"color":15797228},{"x":915,"y":259,"color":15797228},{"x":111,"y":260,"color":15797228},{"x":211,"y":260,"color":15797228},{"x":612,"y":260,"color":15797228},{"x":712,"y":260,"color":15797228},{"x":812,"y":260,"color":15797228},{"x":912,"y":260,"color":15797228},{"x":118,"y":261,"color":15797228},{"x":268,"y":261,"color":15797228},{"x":624,"y":261,"color":15797228},{"x":724,"y":261,"color":15797228},{"x":824,"y":261,"color":15797228},{"x":946,"y":261,"color":15797228},{"x":144,"y":262,"color":15797228},{"x":514,"y":262,"color":15797228},{"x":650,"y":262,"color":15797228},{"x":750,"y":262,"color":15797228},{"x":850,"y":262,"color":15797228},{"x":46,"y":263,"color":15797228},{"x":186,"y":263,"color":15797228},{"x":584,"y":263,"color":15797228},{"x":684,"y":263,"color":15797228},{"x":784,"y":263,"color":15797228},{"x":884,"y":263,"color":15797228},{"x":129,"y":264,"color":15797228},{"x":279,"y":264,"color":15797228},{"x":623,"y":264,"color":15797228},{"x":723,"y":264,"color":15797228},{"x":823,"y":264,"color":15797228},{"x":26,"y":265,"color":15797228},{"x":172,"y":265,"color":15797228},{"x":566,"y":265,"color":15797228},{"x":666,"y":265,"color":15797228},{"x":766,"y":265,"color":15797228},{"x":866,"y":265,"color":15797228},{"x":133,"y":266,"color":15797228},{"x":282,"y":266,"color":15797228},{"x":618,"y":266,"color":15797228},{"x":718,"y":266,"color":15797228},{"x":818,"y":266,"color":15797228},{"x":41,"y":267,"color":15797228},{"x":196,"y":267,"color":15797228},{"x":582,"y":267,"color":15797228},{"x":682,"y":267,"color":15797228},{"x":782,"y":267,"color":15797228},{"x":882,"y":267,"color":15797228},{"x":173,"y":268,"color":15797228},{"x":554,"y":268,"color":15797228},{"x":655,"y":268,"color":15797228},{"x":755,"y":268,"color":15797228},{"x":855,"y":268,"color":15797228},{"x":150,"y":269,"color":15797228},{"x":502,"y":269,"color":15797228},{"x":631,"y":269,"color":15797228},{"x":731,"y":269,"color":15797228},{"x":831,"y":269,"color":15797228},{"x":129,"y":270,"color":15797228},{"x":272,"y":270,"color":15797228},{"x":606,"y":270,"color":15797228},{"x":706,"y":270,"color":15797228},{"x":806,"y":270,"color":15797228},{"x":110,"y":271,"color":15797228},{"x":210,"y":271,"color":15797228},{"x":586,"y":271,"color":15797228},{"x":686,"y":271,"color":15797228},{"x":786,"y":271,"color":15797228},{"x":939,"y":271,"color":15797228},{"x":191,"y":272,"color":15797228},{"x":568,"y":272,"color":15797228},{"x":668,"y":272,"color":15797228},{"x":768,"y":272,"color":15797228},{"x":868,"y":272,"color":15797228},{"x":173,"y":273,"color":15797228},{"x":529,"y":273,"color":15797228},{"x":656,"y":273,"color":15797228},{"x":756,"y":273,"color":15797228},{"x":856,"y":273,"color":15797228},{"x":165,"y":274,"color":15797228},{"x":518,"y":274,"color":15797228},{"x":645,"y":274,"color":15797228},{"x":745,"y":274,"color":15797228},{"x":845,"y":274,"color":15797228},{"x":151,"y":275,"color":15797228},{"x":297,"y":275,"color":15797228},{"x":632,"y":275,"color":15797228},{"x":732,"y":275,"color":15797228},{"x":832,"y":275,"color":15797228},{"x":134,"y":276,"color":15797228},{"x":279,"y":276,"color":15797228},{"x":605,"y":276,"color":15797228},{"x":705,"y":276,"color":15797228},{"x":805,"y":276,"color":15797228},{"x":108,"y":277,"color":15797228},{"x":208,"y":277,"color":15797228},{"x":580,"y":277,"color":15797228},{"x":680,"y":277,"color":15797228},{"x":780,"y":277,"color":15797228},{"x":932,"y":277,"color":15797228},{"x":190,"y":278,"color":15797228},{"x":555,"y":278,"color":15797228},{"x":657,"y":278,"color":15797228},{"x":757,"y":278,"color":15797228},{"x":857,"y":278,"color":15797228},{"x":168,"y":279,"color":15797228},{"x":306,"y":279,"color":15797228},{"x":623,"y":279,"color":15797228},{"x":723,"y":279,"color":15797228},{"x":823,"y":279,"color":15797228},{"x":137,"y":280,"color":15797228},{"x":273,"y":280,"color":15797228},{"x":596,"y":280,"color":15797228},{"x":696,"y":280,"color":15797228},{"x":796,"y":280,"color":15797228},{"x":30,"y":281,"color":15797228},{"x":208,"y":281,"color":15797228},{"x":564,"y":281,"color":15797228},{"x":664,"y":281,"color":15797228},{"x":764,"y":281,"color":15797228},{"x":864,"y":281,"color":15797228},{"x":176,"y":282,"color":15797228},{"x":472,"y":282,"color":15797228},{"x":640,"y":282,"color":15797228},{"x":740,"y":282,"color":15797228},{"x":840,"y":282,"color":15797228},{"x":154,"y":283,"color":15797228},{"x":288,"y":283,"color":15797228},{"x":622,"y":283,"color":15797228},{"x":722,"y":283,"color":15797228},{"x":822,"y":283,"color":15797228},{"x":142,"y":284,"color":15797228},{"x":273,"y":284,"color":15797228},{"x":608,"y":284,"color":15797228},{"x":708,"y":284,"color":15797228},{"x":808,"y":284,"color":15797228},{"x":129,"y":285,"color":15797228},{"x":229,"y":285,"color":15797228},{"x":584,"y":285,"color":15797228},{"x":684,"y":285,"color":15797228},{"x":784,"y":285,"color":15797228},{"x":941,"y":285,"color":15797228},{"x":210,"y":286,"color":15797228},{"x":555,"y":286,"color":15797228},{"x":658,"y":286,"color":15797228},{"x":759,"y":286,"color":15797228},{"x":862,"y":286,"color":15797228},{"x":187,"y":287,"color":15797228},{"x":309,"y":287,"color":15797228},{"x":634,"y":287,"color":15797228},{"x":741,"y":287,"color":15797228},{"x":844,"y":287,"color":15797228},{"x":172,"y":288,"color":15797228},{"x":286,"y":288,"color":15797228},{"x":615,"y":288,"color":15797228},{"x":719,"y":288,"color":15797228},{"x":822,"y":288,"color":15797228},{"x":149,"y":289,"color":15797228},{"x":249,"y":289,"color":15797228},{"x":585,"y":289,"color":15797228},{"x":691,"y":289,"color":15797228},{"x":791,"y":289,"color":15797228},{"x":122,"y":290,"color":15797228},{"x":222,"y":290,"color":15797228},{"x":534,"y":290,"color":15797228},{"x":644,"y":290,"color":15797228},{"x":751,"y":290,"color":15797228},{"x":854,"y":290,"color":15797228},{"x":183,"y":291,"color":15797228},{"x":293,"y":291,"color":15797228},{"x":605,"y":291,"color":15797228},{"x":711,"y":291,"color":15797228},{"x":815,"y":291,"color":15797228},{"x":143,"y":292,"color":15797228},{"x":243,"y":292,"color":15797228},{"x":565,"y":292,"color":15797228},{"x":674,"y":292,"color":15797228},{"x":783,"y":292,"color":15797228},{"x":118,"y":293,"color":15797228},{"x":218,"y":293,"color":15797228},{"x":510,"y":293,"color":15797228},{"x":626,"y":293,"color":15797228},{"x":741,"y":293,"color":15797228},{"x":846,"y":293,"color":15797228},{"x":177,"y":294,"color":15797228},{"x":290,"y":294,"color":15797228},{"x":580,"y":294,"color":15797228},{"x":682,"y":294,"color":15797228},{"x":788,"y":294,"color":15797228},{"x":125,"y":295,"color":15797228},{"x":229,"y":295,"color":15797228},{"x":515,"y":295,"color":15797228},{"x":623,"y":295,"color":15797228},{"x":732,"y":295,"color":15797228},{"x":837,"y":295,"color":15797228},{"x":169,"y":296,"color":15797228},{"x":285,"y":296,"color":15797228},{"x":558,"y":296,"color":15797228},{"x":662,"y":296,"color":15797228},{"x":768,"y":296,"color":15797228},{"x":882,"y":296,"color":15797228},{"x":214,"y":297,"color":15797228},{"x":324,"y":297,"color":15797228},{"x":592,"y":297,"color":15797228},{"x":694,"y":297,"color":15797228},{"x":802,"y":297,"color":15797228},{"x":131,"y":298,"color":15797228},{"x":236,"y":298,"color":15797228},{"x":502,"y":298,"color":15797228},{"x":610,"y":298,"color":15797228},{"x":713,"y":298,"color":15797228},{"x":819,"y":298,"color":15797228},{"x":151,"y":299,"color":15797228},{"x":267,"y":299,"color":15797228},{"x":523,"y":299,"color":15797228},{"x":626,"y":299,"color":15797228},{"x":731,"y":299,"color":15797228},{"x":838,"y":299,"color":15797228},{"x":169,"y":300,"color":15797228},{"x":284,"y":300,"color":15797228},{"x":539,"y":300,"color":15797228},{"x":644,"y":300,"color":15797228},{"x":747,"y":300,"color":15797228},{"x":855,"y":300,"color":15797228},{"x":186,"y":301,"color":15797228},{"x":301,"y":301,"color":15797228},{"x":556,"y":301,"color":15797228},{"x":665,"y":301,"color":15797228},{"x":767,"y":301,"color":15797228},{"x":875,"y":301,"color":15797228},{"x":211,"y":302,"color":15797228},{"x":320,"y":302,"color":15797228},{"x":581,"y":302,"color":15797228},{"x":683,"y":302,"color":15797228},{"x":788,"y":302,"color":15797228},{"x":930,"y":302,"color":15797228},{"x":224,"y":303,"color":15797228},{"x":474,"y":303,"color":15797228},{"x":602,"y":303,"color":15797228},{"x":704,"y":303,"color":15797228},{"x":815,"y":303,"color":15797228},{"x":148,"y":304,"color":15797228},{"x":250,"y":304,"color":15797228},{"x":518,"y":304,"color":15797228},{"x":638,"y":304,"color":15797228},{"x":741,"y":304,"color":15797228},{"x":858,"y":304,"color":15797228},{"x":189,"y":305,"color":15797228},{"x":297,"y":305,"color":15797228},{"x":586,"y":305,"color":15797228},{"x":695,"y":305,"color":15797228},{"x":809,"y":305,"color":15797228},{"x":145,"y":306,"color":15797228},{"x":248,"y":306,"color":15797228},{"x":527,"y":306,"color":15797228},{"x":641,"y":306,"color":15797228},{"x":747,"y":306,"color":15797228},{"x":856,"y":306,"color":15797228},{"x":193,"y":307,"color":15797228},{"x":295,"y":307,"color":15797228},{"x":563,"y":307,"color":15797228},{"x":679,"y":307,"color":15797228},{"x":791,"y":307,"color":15797228},{"x":135,"y":308,"color":15797228},{"x":237,"y":308,"color":15797228},{"x":506,"y":308,"color":15797228},{"x":616,"y":308,"color":15797228},{"x":738,"y":308,"color":15797228},{"x":844,"y":308,"color":15797228},{"x":189,"y":309,"color":15797228},{"x":291,"y":309,"color":15797228},{"x":570,"y":309,"color":15797228},{"x":680,"y":309,"color":15797228},{"x":792,"y":309,"color":15797228},{"x":136,"y":310,"color":15797228},{"x":238,"y":310,"color":15797228},{"x":517,"y":310,"color":15797228},{"x":640,"y":310,"color":15797228},{"x":745,"y":310,"color":15797228},{"x":865,"y":310,"color":15797228},{"x":206,"y":311,"color":15797228},{"x":504,"y":311,"color":15797228},{"x":617,"y":311,"color":15797228},{"x":721,"y":311,"color":15797228},{"x":847,"y":311,"color":15797228},{"x":188,"y":312,"color":15797228},{"x":288,"y":312,"color":15797228},{"x":597,"y":312,"color":15797228},{"x":701,"y":312,"color":15797228},{"x":826,"y":312,"color":15797228},{"x":171,"y":313,"color":15797228},{"x":271,"y":313,"color":15797228},{"x":570,"y":313,"color":15797228},{"x":676,"y":313,"color":15797228},{"x":788,"y":313,"color":15797228},{"x":151,"y":314,"color":15797228},{"x":253,"y":314,"color":15797228},{"x":555,"y":314,"color":15797228},{"x":658,"y":314,"color":15797228},{"x":764,"y":314,"color":15797228},{"x":879,"y":314,"color":15797228},{"x":224,"y":315,"color":15797228},{"x":515,"y":315,"color":15797228},{"x":632,"y":315,"color":15797228},{"x":736,"y":315,"color":15797228},{"x":847,"y":315,"color":15797228},{"x":280,"y":316,"color":15797228},{"x":571,"y":316,"color":15797228},{"x":673,"y":316,"color":15797228},{"x":777,"y":316,"color":15797228},{"x":888,"y":316,"color":15797228},{"x":240,"y":317,"color":15797228},{"x":515,"y":317,"color":15797228},{"x":631,"y":317,"color":15797228},{"x":735,"y":317,"color":15797228},{"x":837,"y":317,"color":15797228},{"x":190,"y":318,"color":15797228},{"x":474,"y":318,"color":15797228},{"x":598,"y":318,"color":15797228},{"x":699,"y":318,"color":15797228},{"x":805,"y":318,"color":15797228},{"x":161,"y":319,"color":15797228},{"x":276,"y":319,"color":15797228},{"x":557,"y":319,"color":15797228},{"x":665,"y":319,"color":15797228},{"x":770,"y":319,"color":15797228},{"x":880,"y":319,"color":15797228},{"x":253,"y":320,"color":15797228},{"x":526,"y":320,"color":15797228},{"x":651,"y":320,"color":15797228},{"x":755,"y":320,"color":15797228},{"x":859,"y":320,"color":15797228},{"x":215,"y":321,"color":15797228},{"x":506,"y":321,"color":15797228},{"x":638,"y":321,"color":15797228},{"x":744,"y":321,"color":15797228},{"x":855,"y":321,"color":15797228},{"x":219,"y":322,"color":15797228},{"x":540,"y":322,"color":15797228},{"x":652,"y":322,"color":15797228},{"x":755,"y":322,"color":15797228},{"x":859,"y":322,"color":15797228},{"x":215,"y":323,"color":15797228},{"x":527,"y":323,"color":15797228},{"x":635,"y":323,"color":15797228},{"x":738,"y":323,"color":15797228},{"x":841,"y":323,"color":15797228},{"x":196,"y":324,"color":15797228},{"x":508,"y":324,"color":15797228},{"x":626,"y":324,"color":15797228},{"x":739,"y":324,"color":15797228},{"x":843,"y":324,"color":15797228},{"x":198,"y":325,"color":15797228},{"x":504,"y":325,"color":15797228},{"x":637,"y":325,"color":15797228},{"x":741,"y":325,"color":15797228},{"x":845,"y":325,"color":15797228},{"x":198,"y":326,"color":15797228},{"x":499,"y":326,"color":15797228},{"x":643,"y":326,"color":15797228},{"x":746,"y":326,"color":15797228},{"x":854,"y":326,"color":15797228},{"x":211,"y":327,"color":15797228},{"x":500,"y":327,"color":15797228},{"x":653,"y":327,"color":15797228},{"x":755,"y":327,"color":15797228},{"x":858,"y":327,"color":15797228},{"x":217,"y":328,"color":15797228},{"x":516,"y":328,"color":15797228},{"x":667,"y":328,"color":15797228},{"x":770,"y":328,"color":15797228},{"x":873,"y":328,"color":15797228},{"x":231,"y":329,"color":15797228},{"x":550,"y":329,"color":15797228},{"x":689,"y":329,"color":15797228},{"x":793,"y":329,"color":15797228},{"x":153,"y":330,"color":15797228},{"x":274,"y":330,"color":15797228},{"x":596,"y":330,"color":15797228},{"x":713,"y":330,"color":15797228},{"x":818,"y":330,"color":15797228},{"x":177,"y":331,"color":15797228},{"x":483,"y":331,"color":15797228},{"x":635,"y":331,"color":15797228},{"x":744,"y":331,"color":15797228},{"x":848,"y":331,"color":15797228},{"x":209,"y":332,"color":15797228},{"x":516,"y":332,"color":15797228},{"x":674,"y":332,"color":15797228},{"x":785,"y":332,"color":15797228},{"x":152,"y":333,"color":15797228},{"x":284,"y":333,"color":15797228},{"x":603,"y":333,"color":15797228},{"x":726,"y":333,"color":15797228},{"x":839,"y":333,"color":15797228},{"x":200,"y":334,"color":15797228},{"x":507,"y":334,"color":15797228},{"x":669,"y":334,"color":15797228},{"x":773,"y":334,"color":15797228},{"x":136,"y":335,"color":15797228},{"x":241,"y":335,"color":15797228},{"x":561,"y":335,"color":15797228},{"x":709,"y":335,"color":15797228},{"x":815,"y":335,"color":15797228},{"x":175,"y":336,"color":15797228},{"x":297,"y":336,"color":15797228},{"x":648,"y":336,"color":15797228},{"x":751,"y":336,"color":15797228},{"x":856,"y":336,"color":15797228},{"x":214,"y":337,"color":15797228},{"x":541,"y":337,"color":15797228},{"x":700,"y":337,"color":15797228},{"x":804,"y":337,"color":15797228},{"x":160,"y":338,"color":15797228},{"x":278,"y":338,"color":15797228},{"x":652,"y":338,"color":15797228},{"x":766,"y":338,"color":15797228},{"x":888,"y":338,"color":15797228},{"x":223,"y":339,"color":15797228},{"x":558,"y":339,"color":15797228},{"x":715,"y":339,"color":15797228},{"x":820,"y":339,"color":15797228},{"x":175,"y":340,"color":15797228},{"x":461,"y":340,"color":15797228},{"x":660,"y":340,"color":15797228},{"x":771,"y":340,"color":15797228},{"x":133,"y":341,"color":15797228},{"x":233,"y":341,"color":15797228},{"x":604,"y":341,"color":15797228},{"x":745,"y":341,"color":15797228},{"x":848,"y":341,"color":15797228},{"x":215,"y":342,"color":15797228},{"x":553,"y":342,"color":15797228},{"x":733,"y":342,"color":15797228},{"x":888,"y":342,"color":15797228},{"x":227,"y":343,"color":15797228},{"x":607,"y":343,"color":15797228},{"x":742,"y":343,"color":15797228},{"x":134,"y":344,"color":15797228},{"x":239,"y":344,"color":15797228},{"x":612,"y":344,"color":15797228},{"x":745,"y":344,"color":15797228},{"x":133,"y":345,"color":15797228},{"x":233,"y":345,"color":15797228},{"x":613,"y":345,"color":15797228},{"x":748,"y":345,"color":15797228},{"x":137,"y":346,"color":15797228},{"x":239,"y":346,"color":15797228},{"x":606,"y":346,"color":15797228},{"x":737,"y":346,"color":15797228},{"x":840,"y":346,"color":15797228},{"x":225,"y":347,"color":15797228},{"x":577,"y":347,"color":15797228},{"x":738,"y":347,"color":15797228},{"x":838,"y":347,"color":15797228},{"x":222,"y":348,"color":15797228},{"x":579,"y":348,"color":15797228},{"x":741,"y":348,"color":15797228},{"x":841,"y":348,"color":15797228},{"x":221,"y":349,"color":15797228},{"x":572,"y":349,"color":15797228},{"x":701,"y":349,"color":15797228},{"x":802,"y":349,"color":15797228},{"x":186,"y":350,"color":15797228},{"x":475,"y":350,"color":15797228},{"x":655,"y":350,"color":15797228},{"x":770,"y":350,"color":15797228},{"x":153,"y":351,"color":15797228},{"x":253,"y":351,"color":15797228},{"x":609,"y":351,"color":15797228},{"x":736,"y":351,"color":15797228},{"x":844,"y":351,"color":15797228},{"x":222,"y":352,"color":15797228},{"x":575,"y":352,"color":15797228},{"x":707,"y":352,"color":15797228},{"x":807,"y":352,"color":15797228},{"x":197,"y":353,"color":15797228},{"x":544,"y":353,"color":15797228},{"x":676,"y":353,"color":15797228},{"x":780,"y":353,"color":15797228},{"x":175,"y":354,"color":15797228},{"x":467,"y":354,"color":15797228},{"x":658,"y":354,"color":15797228},{"x":776,"y":354,"color":15797228},{"x":174,"y":355,"color":15797228},{"x":466,"y":355,"color":15797228},{"x":658,"y":355,"color":15797228},{"x":769,"y":355,"color":15797228},{"x":173,"y":356,"color":15797228},{"x":465,"y":356,"color":15797228},{"x":663,"y":356,"color":15797228},{"x":770,"y":356,"color":15797228},{"x":175,"y":357,"color":15797228},{"x":468,"y":357,"color":15797228},{"x":664,"y":357,"color":15797228},{"x":772,"y":357,"color":15797228},{"x":176,"y":358,"color":15797228},{"x":471,"y":358,"color":15797228},{"x":667,"y":358,"color":15797228},{"x":778,"y":358,"color":15797228},{"x":189,"y":359,"color":15797228},{"x":563,"y":359,"color":15797228},{"x":693,"y":359,"color":15797228},{"x":795,"y":359,"color":15797228},{"x":205,"y":360,"color":15797228},{"x":569,"y":360,"color":15797228},{"x":702,"y":360,"color":15797228},{"x":802,"y":360,"color":15797228},{"x":208,"y":361,"color":15797228},{"x":578,"y":361,"color":15797228},{"x":716,"y":361,"color":15797228},{"x":816,"y":361,"color":15797228},{"x":215,"y":362,"color":15797228},{"x":590,"y":362,"color":15797228},{"x":739,"y":362,"color":15797228},{"x":883,"y":362,"color":15797228},{"x":235,"y":363,"color":15797228},{"x":640,"y":363,"color":15797228},{"x":758,"y":363,"color":15797228},{"x":154,"y":364,"color":15797228},{"x":254,"y":364,"color":15797228},{"x":674,"y":364,"color":15797228},{"x":786,"y":364,"color":15797228},{"x":178,"y":365,"color":15797228},{"x":499,"y":365,"color":15797228},{"x":677,"y":365,"color":15797228},{"x":782,"y":365,"color":15797228},{"x":175,"y":366,"color":15797228},{"x":495,"y":366,"color":15797228},{"x":679,"y":366,"color":15797228},{"x":782,"y":366,"color":15797228},{"x":178,"y":367,"color":15797228},{"x":497,"y":367,"color":15797228},{"x":681,"y":367,"color":15797228},{"x":786,"y":367,"color":15797228},{"x":181,"y":368,"color":15797228},{"x":495,"y":368,"color":15797228},{"x":674,"y":368,"color":15797228},{"x":779,"y":368,"color":15797228},{"x":179,"y":369,"color":15797228},{"x":492,"y":369,"color":15797228},{"x":673,"y":369,"color":15797228},{"x":777,"y":369,"color":15797228},{"x":169,"y":370,"color":15797228},{"x":470,"y":370,"color":15797228},{"x":650,"y":370,"color":15797228},{"x":757,"y":370,"color":15797228},{"x":158,"y":371,"color":15797228},{"x":258,"y":371,"color":15797228},{"x":642,"y":371,"color":15797228},{"x":755,"y":371,"color":15797228},{"x":169,"y":372,"color":15797228},{"x":472,"y":372,"color":15797228},{"x":654,"y":372,"color":15797228},{"x":766,"y":372,"color":15797228},{"x":183,"y":373,"color":15797228},{"x":488,"y":373,"color":15797228},{"x":670,"y":373,"color":15797228},{"x":778,"y":373,"color":15797228},{"x":194,"y":374,"color":15797228},{"x":501,"y":374,"color":15797228},{"x":687,"y":374,"color":15797228},{"x":789,"y":374,"color":15797228},{"x":208,"y":375,"color":15797228},{"x":587,"y":375,"color":15797228},{"x":696,"y":375,"color":15797228},{"x":797,"y":375,"color":15797228},{"x":217,"y":376,"color":15797228},{"x":597,"y":376,"color":15797228},{"x":705,"y":376,"color":15797228},{"x":807,"y":376,"color":15797228},{"x":225,"y":377,"color":15797228},{"x":607,"y":377,"color":15797228},{"x":716,"y":377,"color":15797228},{"x":816,"y":377,"color":15797228},{"x":244,"y":378,"color":15797228},{"x":623,"y":378,"color":15797228},{"x":730,"y":378,"color":15797228},{"x":153,"y":379,"color":15797228},{"x":459,"y":379,"color":15797228},{"x":629,"y":379,"color":15797228},{"x":739,"y":379,"color":15797228},{"x":164,"y":380,"color":15797228},{"x":468,"y":380,"color":15797228},{"x":633,"y":380,"color":15797228},{"x":740,"y":380,"color":15797228},{"x":167,"y":381,"color":15797228},{"x":481,"y":381,"color":15797228},{"x":641,"y":381,"color":15797228},{"x":750,"y":381,"color":15797228},{"x":191,"y":382,"color":15797228},{"x":498,"y":382,"color":15797228},{"x":653,"y":382,"color":15797228},{"x":764,"y":382,"color":15797228},{"x":206,"y":383,"color":15797228},{"x":514,"y":383,"color":15797228},{"x":652,"y":383,"color":15797228},{"x":761,"y":383,"color":15797228},{"x":193,"y":384,"color":15797228},{"x":500,"y":384,"color":15797228},{"x":627,"y":384,"color":15797228},{"x":734,"y":384,"color":15797228},{"x":165,"y":385,"color":15797228},{"x":477,"y":385,"color":15797228},{"x":593,"y":385,"color":15797228},{"x":702,"y":385,"color":15797228},{"x":805,"y":385,"color":15797228},{"x":459,"y":386,"color":15797228},{"x":567,"y":386,"color":15797228},{"x":683,"y":386,"color":15797228},{"x":791,"y":386,"color":15797228},{"x":227,"y":387,"color":15797228},{"x":553,"y":387,"color":15797228},{"x":675,"y":387,"color":15797228},{"x":782,"y":387,"color":15797228},{"x":251,"y":388,"color":15797228},{"x":562,"y":388,"color":15797228},{"x":691,"y":388,"color":15797228},{"x":796,"y":388,"color":15797228},{"x":475,"y":389,"color":15797228},{"x":581,"y":389,"color":15797228},{"x":716,"y":389,"color":15797228},{"x":823,"y":389,"color":15797228},{"x":504,"y":390,"color":15797228},{"x":634,"y":390,"color":15797228},{"x":741,"y":390,"color":15797228},{"x":184,"y":391,"color":15797228},{"x":529,"y":391,"color":15797228},{"x":645,"y":391,"color":15797228},{"x":759,"y":391,"color":15797228},{"x":195,"y":392,"color":15797228},{"x":536,"y":392,"color":15797228},{"x":655,"y":392,"color":15797228},{"x":775,"y":392,"color":15797228},{"x":451,"y":393,"color":15797228},{"x":553,"y":393,"color":15797228},{"x":669,"y":393,"color":15797228},{"x":795,"y":393,"color":15797228},{"x":473,"y":394,"color":15797228},{"x":576,"y":394,"color":15797228},{"x":700,"y":394,"color":15797228},{"x":820,"y":394,"color":15797228},{"x":499,"y":395,"color":15797228},{"x":609,"y":395,"color":15797228},{"x":727,"y":395,"color":15797228},{"x":176,"y":396,"color":15797228},{"x":517,"y":396,"color":15797228},{"x":636,"y":396,"color":15797228},{"x":755,"y":396,"color":15797228},{"x":205,"y":397,"color":15797228},{"x":551,"y":397,"color":15797228},{"x":680,"y":397,"color":15797228},{"x":800,"y":397,"color":15797228},{"x":487,"y":398,"color":15797228},{"x":598,"y":398,"color":15797228},{"x":725,"y":398,"color":15797228},{"x":188,"y":399,"color":15797228},{"x":532,"y":399,"color":15797228},{"x":665,"y":399,"color":15797228},{"x":775,"y":399,"color":15797228},{"x":472,"y":400,"color":15797228},{"x":576,"y":400,"color":15797228},{"x":707,"y":400,"color":15797228},{"x":814,"y":400,"color":15797228},{"x":503,"y":401,"color":15797228},{"x":614,"y":401,"color":15797228},{"x":747,"y":401,"color":15797228},{"x":201,"y":402,"color":15797228},{"x":544,"y":402,"color":15797228},{"x":699,"y":402,"color":15797228},{"x":812,"y":402,"color":15797228},{"x":510,"y":403,"color":15797228},{"x":620,"y":403,"color":15797228},{"x":778,"y":403,"color":15797228},{"x":476,"y":404,"color":15797228},{"x":581,"y":404,"color":15797228},{"x":740,"y":404,"color":15797228},{"x":200,"y":405,"color":15797228},{"x":548,"y":405,"color":15797228},{"x":709,"y":405,"color":15797228},{"x":816,"y":405,"color":15797228},{"x":519,"y":406,"color":15797228},{"x":629,"y":406,"color":15797228},{"x":793,"y":406,"color":15797228},{"x":494,"y":407,"color":15797228},{"x":606,"y":407,"color":15797228},{"x":753,"y":407,"color":15797228},{"x":456,"y":408,"color":15797228},{"x":569,"y":408,"color":15797228},{"x":713,"y":408,"color":15797228},{"x":188,"y":409,"color":15797228},{"x":542,"y":409,"color":15797228},{"x":693,"y":409,"color":15797228},{"x":807,"y":409,"color":15797228},{"x":507,"y":410,"color":15797228},{"x":631,"y":410,"color":15797228},{"x":794,"y":410,"color":15797228},{"x":500,"y":411,"color":15797228},{"x":620,"y":411,"color":15797228},{"x":765,"y":411,"color":15797228},{"x":479,"y":412,"color":15797228},{"x":629,"y":412,"color":15797228},{"x":777,"y":412,"color":15797228},{"x":491,"y":413,"color":15797228},{"x":608,"y":413,"color":15797228},{"x":755,"y":413,"color":15797228},{"x":494,"y":414,"color":15797228},{"x":610,"y":414,"color":15797228},{"x":762,"y":414,"color":15797228},{"x":488,"y":415,"color":15797228},{"x":605,"y":415,"color":15797228},{"x":759,"y":415,"color":15797228},{"x":481,"y":416,"color":15797228},{"x":601,"y":416,"color":15797228},{"x":761,"y":416,"color":15797228},{"x":485,"y":417,"color":15797228},{"x":604,"y":417,"color":15797228},{"x":771,"y":417,"color":15797228},{"x":485,"y":418,"color":15797228},{"x":610,"y":418,"color":15797228},{"x":780,"y":418,"color":15797228},{"x":509,"y":419,"color":15797228},{"x":627,"y":419,"color":15797228},{"x":204,"y":420,"color":15797228},{"x":526,"y":420,"color":15797228},{"x":643,"y":420,"color":15797228},{"x":282,"y":421,"color":15797228},{"x":542,"y":421,"color":15797228},{"x":703,"y":421,"color":15797228},{"x":449,"y":422,"color":15797228},{"x":554,"y":422,"color":15797228},{"x":723,"y":422,"color":15797228},{"x":476,"y":423,"color":15797228},{"x":579,"y":423,"color":15797228},{"x":776,"y":423,"color":15797228},{"x":495,"y":424,"color":15797228},{"x":609,"y":424,"color":15797228},{"x":209,"y":425,"color":15797228},{"x":525,"y":425,"color":15797228},{"x":692,"y":425,"color":15797228},{"x":450,"y":426,"color":15797228},{"x":556,"y":426,"color":15797228},{"x":773,"y":426,"color":15797228},{"x":497,"y":427,"color":15797228},{"x":624,"y":427,"color":15797228},{"x":443,"y":428,"color":15797228},{"x":547,"y":428,"color":15797228},{"x":761,"y":428,"color":15797228},{"x":493,"y":429,"color":15797228},{"x":612,"y":429,"color":15797228},{"x":454,"y":430,"color":15797228},{"x":561,"y":430,"color":15797228},{"x":780,"y":430,"color":15797228},{"x":521,"y":431,"color":15797228},{"x":702,"y":431,"color":15797228},{"x":506,"y":432,"color":15797228},{"x":623,"y":432,"color":15797228},{"x":469,"y":433,"color":15797228},{"x":579,"y":433,"color":15797228},{"x":436,"y":434,"color":15797228},{"x":550,"y":434,"color":15797228},{"x":793,"y":434,"color":15797228},{"x":520,"y":435,"color":15797228},{"x":765,"y":435,"color":15797228},{"x":512,"y":436,"color":15797228},{"x":703,"y":436,"color":15797228},{"x":515,"y":437,"color":15797228},{"x":705,"y":437,"color":15797228},{"x":532,"y":438,"color":15797228},{"x":783,"y":438,"color":15797228},{"x":548,"y":439,"color":15797228},{"x":241,"y":440,"color":15797228},{"x":559,"y":440,"color":15797228},{"x":466,"y":441,"color":15797228},{"x":581,"y":441,"color":15797228},{"x":496,"y":442,"color":15797228},{"x":701,"y":442,"color":15797228},{"x":521,"y":443,"color":15797228},{"x":241,"y":444,"color":15797228},{"x":550,"y":444,"color":15797228},{"x":453,"y":445,"color":15797228},{"x":580,"y":445,"color":15797228},{"x":488,"y":446,"color":15797228},{"x":601,"y":446,"color":15797228},{"x":497,"y":447,"color":15797228},{"x":617,"y":447,"color":15797228},{"x":512,"y":448,"color":15797228},{"x":786,"y":448,"color":15797228},{"x":527,"y":449,"color":15797228},{"x":273,"y":450,"color":15797228},{"x":529,"y":450,"color":15797228},{"x":269,"y":451,"color":15797228},{"x":518,"y":451,"color":15797228},{"x":842,"y":451,"color":15797228},{"x":505,"y":452,"color":15797228},{"x":622,"y":452,"color":15797228},{"x":495,"y":453,"color":15797228},{"x":607,"y":453,"color":15797228},{"x":480,"y":454,"color":15797228},{"x":594,"y":454,"color":15797228},{"x":464,"y":455,"color":15797228},{"x":582,"y":455,"color":15797228},{"x":454,"y":456,"color":15797228},{"x":571,"y":456,"color":15797228},{"x":316,"y":457,"color":15797228},{"x":568,"y":457,"color":15797228},{"x":305,"y":458,"color":15797228},{"x":563,"y":458,"color":15797228},{"x":305,"y":459,"color":15797228},{"x":564,"y":459,"color":15797228},{"x":306,"y":460,"color":15797228},{"x":562,"y":460,"color":15797228},{"x":303,"y":461,"color":15797228},{"x":562,"y":461,"color":15797228},{"x":296,"y":462,"color":15797228},{"x":578,"y":462,"color":15797228},{"x":318,"y":463,"color":15797228},{"x":613,"y":463,"color":15797228},{"x":521,"y":464,"color":15797228},{"x":282,"y":465,"color":15797228},{"x":583,"y":465,"color":15797228},{"x":337,"y":466,"color":15797228},{"x":265,"y":467,"color":15797228},{"x":556,"y":467,"color":15797228},{"x":289,"y":468,"color":15797228},{"x":579,"y":468,"color":15797228},{"x":315,"y":469,"color":15797228},{"x":604,"y":469,"color":15797228},{"x":531,"y":470,"color":15797228},{"x":816,"y":470,"color":15797228},{"x":559,"y":471,"color":15797228},{"x":295,"y":472,"color":15797228},{"x":585,"y":472,"color":15797228},{"x":327,"y":473,"color":15797228},{"x":769,"y":473,"color":15797228},{"x":523,"y":474,"color":15797228},{"x":813,"y":474,"color":15797228},{"x":530,"y":475,"color":15797228},{"x":813,"y":475,"color":15797228},{"x":529,"y":476,"color":15797228},{"x":817,"y":476,"color":15797228},{"x":536,"y":477,"color":15797228},{"x":266,"y":478,"color":15797228},{"x":539,"y":478,"color":15797228},{"x":274,"y":479,"color":15797228},{"x":541,"y":479,"color":15797228},{"x":279,"y":480,"color":15797228},{"x":541,"y":480,"color":15797228},{"x":272,"y":481,"color":15797228},{"x":536,"y":481,"color":15797228},{"x":265,"y":482,"color":15797228},{"x":526,"y":482,"color":15797228},{"x":876,"y":482,"color":15797228},{"x":531,"y":483,"color":15797228},{"x":270,"y":484,"color":15797228},{"x":536,"y":484,"color":15797228},{"x":260,"y":485,"color":15797228},{"x":518,"y":485,"color":15797228},{"x":862,"y":485,"color":15797228},{"x":342,"y":486,"color":15797228},{"x":592,"y":486,"color":15797228},{"x":315,"y":487,"color":15797228},{"x":562,"y":487,"color":15797228},{"x":288,"y":488,"color":15797228},{"x":532,"y":488,"color":15797228},{"x":261,"y":489,"color":15797228},{"x":367,"y":489,"color":15797228},{"x":889,"y":489,"color":15797228},{"x":353,"y":490,"color":15797228},{"x":875,"y":490,"color":15797228},{"x":336,"y":491,"color":15797228},{"x":581,"y":491,"color":15797228},{"x":313,"y":492,"color":15797228},{"x":550,"y":492,"color":15797228},{"x":289,"y":493,"color":15797228},{"x":537,"y":493,"color":15797228},{"x":272,"y":494,"color":15797228},{"x":373,"y":494,"color":15797228},{"x":900,"y":494,"color":15797228},{"x":355,"y":495,"color":15797228},{"x":785,"y":495,"color":15797228},{"x":328,"y":496,"color":15797228},{"x":570,"y":496,"color":15797228},{"x":305,"y":497,"color":15797228},{"x":551,"y":497,"color":15797228},{"x":279,"y":498,"color":15797228},{"x":379,"y":498,"color":15797228},{"x":891,"y":498,"color":15797228},{"x":354,"y":499,"color":15797228},{"x":807,"y":499,"color":15797228},{"x":343,"y":500,"color":15797228},{"x":590,"y":500,"color":15797228},{"x":344,"y":501,"color":15797228},{"x":590,"y":501,"color":15797228},{"x":345,"y":502,"color":15797228},{"x":592,"y":502,"color":15797228},{"x":349,"y":503,"color":15797228},{"x":904,"y":503,"color":15797228},{"x":367,"y":504,"color":15797228},{"x":269,"y":505,"color":15797228},{"x":523,"y":505,"color":15797228},{"x":288,"y":506,"color":15797228},{"x":536,"y":506,"color":15797228},{"x":312,"y":507,"color":15797228},{"x":559,"y":507,"color":15797228},{"x":341,"y":508,"color":15797228},{"x":268,"y":509,"color":15797228},{"x":372,"y":509,"color":15797228},{"x":303,"y":510,"color":15797228},{"x":550,"y":510,"color":15797228},{"x":336,"y":511,"color":15797228},{"x":595,"y":511,"color":15797228},{"x":362,"y":512,"color":15797228},{"x":272,"y":513,"color":15797228},{"x":526,"y":513,"color":15797228},{"x":289,"y":514,"color":15797228},{"x":540,"y":514,"color":15797228},{"x":303,"y":515,"color":15797228},{"x":556,"y":515,"color":15797228},{"x":313,"y":516,"color":15797228},{"x":562,"y":516,"color":15797228},{"x":316,"y":517,"color":15797228},{"x":564,"y":517,"color":15797228},{"x":314,"y":518,"color":15797228},{"x":562,"y":518,"color":15797228},{"x":315,"y":519,"color":15797228},{"x":563,"y":519,"color":15797228},{"x":305,"y":520,"color":15797228},{"x":554,"y":520,"color":15797228},{"x":293,"y":521,"color":15797228},{"x":541,"y":521,"color":15797228},{"x":274,"y":522,"color":15797228},{"x":522,"y":522,"color":15797228},{"x":864,"y":522,"color":15797228},{"x":365,"y":523,"color":15797228},{"x":849,"y":523,"color":15797228},{"x":349,"y":524,"color":15797228},{"x":622,"y":524,"color":15797228},{"x":331,"y":525,"color":15797228},{"x":587,"y":525,"color":15797228},{"x":308,"y":526,"color":15797228},{"x":580,"y":526,"color":15797228},{"x":299,"y":527,"color":15797228},{"x":572,"y":527,"color":15797228},{"x":293,"y":528,"color":15797228},{"x":565,"y":528,"color":15797228},{"x":896,"y":528,"color":15797228},{"x":530,"y":529,"color":15797228},{"x":872,"y":529,"color":15797228},{"x":360,"y":530,"color":15797228},{"x":844,"y":530,"color":15797228},{"x":332,"y":531,"color":15797228},{"x":585,"y":531,"color":15797228},{"x":304,"y":532,"color":15797228},{"x":559,"y":532,"color":15797228},{"x":893,"y":532,"color":15797228},{"x":542,"y":533,"color":15797228},{"x":880,"y":533,"color":15797228},{"x":521,"y":534,"color":15797228},{"x":860,"y":534,"color":15797228},{"x":346,"y":535,"color":15797228},{"x":836,"y":535,"color":15797228},{"x":321,"y":536,"color":15797228},{"x":578,"y":536,"color":15797228},{"x":906,"y":536,"color":15797228},{"x":544,"y":537,"color":15797228},{"x":873,"y":537,"color":15797228},{"x":354,"y":538,"color":15797228},{"x":834,"y":538,"color":15797228},{"x":313,"y":539,"color":15797228},{"x":577,"y":539,"color":15797228},{"x":894,"y":539,"color":15797228},{"x":535,"y":540,"color":15797228},{"x":859,"y":540,"color":15797228},{"x":354,"y":541,"color":15797228},{"x":837,"y":541,"color":15797228},{"x":323,"y":542,"color":15797228},{"x":617,"y":542,"color":15797228},{"x":907,"y":542,"color":15797228},{"x":557,"y":543,"color":15797228},{"x":871,"y":543,"color":15797228},{"x":348,"y":544,"color":15797228},{"x":834,"y":544,"color":15797228},{"x":310,"y":545,"color":15797228},{"x":613,"y":545,"color":15797228},{"x":902,"y":545,"color":15797228},{"x":554,"y":546,"color":15797228},{"x":872,"y":546,"color":15797228},{"x":529,"y":547,"color":15797228},{"x":845,"y":547,"color":15797228},{"x":320,"y":548,"color":15797228},{"x":815,"y":548,"color":15797228},{"x":915,"y":548,"color":15797228},{"x":571,"y":549,"color":15797228},{"x":889,"y":549,"color":15797228},{"x":544,"y":550,"color":15797228},{"x":867,"y":550,"color":15797228},{"x":338,"y":551,"color":15797228},{"x":856,"y":551,"color":15797228},{"x":325,"y":552,"color":15797228},{"x":855,"y":552,"color":15797228},{"x":322,"y":553,"color":15797228},{"x":848,"y":553,"color":15797228},{"x":314,"y":554,"color":15797228},{"x":841,"y":554,"color":15797228},{"x":307,"y":555,"color":15797228},{"x":835,"y":555,"color":15797228},{"x":300,"y":556,"color":15797228},{"x":828,"y":556,"color":15797228},{"x":294,"y":557,"color":15797228},{"x":821,"y":557,"color":15797228},{"x":285,"y":558,"color":15797228},{"x":813,"y":558,"color":15797228},{"x":913,"y":558,"color":15797228},{"x":566,"y":559,"color":15797228},{"x":899,"y":559,"color":15797228},{"x":552,"y":560,"color":15797228},{"x":886,"y":560,"color":15797228},{"x":543,"y":561,"color":15797228},{"x":877,"y":561,"color":15797228},{"x":342,"y":562,"color":15797228},{"x":876,"y":562,"color":15797228},{"x":341,"y":563,"color":15797228},{"x":876,"y":563,"color":15797228},{"x":533,"y":564,"color":15797228},{"x":875,"y":564,"color":15797228},{"x":340,"y":565,"color":15797228},{"x":874,"y":565,"color":15797228},{"x":340,"y":566,"color":15797228},{"x":876,"y":566,"color":15797228},{"x":538,"y":567,"color":15797228},{"x":883,"y":567,"color":15797228},{"x":543,"y":568,"color":15797228},{"x":888,"y":568,"color":15797228},{"x":552,"y":569,"color":15797228},{"x":894,"y":569,"color":15797228},{"x":557,"y":570,"color":15797228},{"x":901,"y":570,"color":15797228},{"x":566,"y":571,"color":15797228},{"x":281,"y":572,"color":15797228},{"x":832,"y":572,"color":15797228},{"x":308,"y":573,"color":15797228},{"x":880,"y":573,"color":15797228},{"x":551,"y":574,"color":15797228},{"x":290,"y":575,"color":15797228},{"x":870,"y":575,"color":15797228},{"x":543,"y":576,"color":15797228},{"x":292,"y":577,"color":15797228},{"x":885,"y":577,"color":15797228},{"x":813,"y":578,"color":15797228},{"x":315,"y":579,"color":15797228},{"x":294,"y":580,"color":15797228},{"x":287,"y":581,"color":15797228},{"x":290,"y":582,"color":15797228},{"x":304,"y":583,"color":15797228},{"x":323,"y":584,"color":15797228},{"x":896,"y":585,"color":15797228},{"x":285,"y":587,"color":15797228},{"x":312,"y":588,"color":15797228},{"x":900,"y":589,"color":15797228},{"x":294,"y":591,"color":15797228},{"x":318,"y":592,"color":15797228},{"x":278,"y":594,"color":15797228},{"x":313,"y":595,"color":15797228},{"x":987,"y":597,"color":15797228},{"x":303,"y":600,"color":15797228},{"x":301,"y":603,"color":15797228},{"x":903,"y":606,"color":15797228},{"x":903,"y":609,"color":15797228},{"x":972,"y":612,"color":15797228},{"x":289,"y":616,"color":15797228},{"x":283,"y":620,"color":15797228},{"x":281,"y":624,"color":15797228},{"x":281,"y":629,"color":15797228},{"x":285,"y":634,"color":15797228},{"x":283,"y":640,"color":15797228},{"x":316,"y":649,"color":15797228}]

},{}]},{},[26]);
