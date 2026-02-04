/**
 * Graph - simple reusable line graph renderer for Pebble windows
 *
 * Renders a line chart with optional title, subtitle, grid lines, and labels.
 */

var UI = require('ui');
var Vector2 = require('vector2');
var Feature = require('platform/feature');

var Graph = function(options) {
    this.options = options || {};
    this.window = new UI.Window({
        backgroundColor: this.options.backgroundColor || 'black',
        status: false
    });
    this._elements = [];
    this._draw();
};

Graph.prototype.show = function() {
    this.window.show();
    return this;
};

Graph.prototype.hide = function() {
    this.window.hide();
    return this;
};

Graph.prototype._add = function(element) {
    this._elements.push(element);
    this.window.add(element);
};

Graph.prototype._clear = function() {
    for (var i = 0; i < this._elements.length; i++) {
        this._elements[i].remove();
    }
    this._elements = [];
};

Graph.prototype.update = function(options) {
    this.options = options || this.options;
    this._clear();
    this._draw();
    return this;
};

Graph.prototype._draw = function() {
    var opts = this.options;
    var values = opts.values || [];
    var size = this.window.size();

    if (!values.length) {
        this._drawEmpty(size);
        return;
    }

    var title = opts.title || '';
    var subtitle = opts.subtitle || '';

    var roundInset = 0;
    if (Feature.round && Feature.round()) {
        var diameter = Math.min(size.x, size.y);
        var inset = (diameter - (diameter / Math.SQRT2)) / 2;
        roundInset = Math.ceil(inset);
    }

    var titleOffset = roundInset ? Math.floor(roundInset / 2) : 0;
    var marginTop = title ? 22 : 6;
    if (subtitle) {
        marginTop += 16;
    }
    marginTop += roundInset;
    var marginLeft = (opts.marginLeft || 34) + roundInset;
    var marginRight = (opts.marginRight || 16) + roundInset;
    var marginBottom = (opts.marginBottom || 18) + roundInset;

    var plotWidth = Math.max(1, size.x - marginLeft - marginRight);
    var plotHeight = Math.max(1, size.y - marginTop - marginBottom);
    var plotTop = marginTop;
    var plotLeft = marginLeft;

    var minValue = (opts.valueMin !== undefined) ? opts.valueMin : Math.min.apply(null, values);
    var maxValue = (opts.valueMax !== undefined) ? opts.valueMax : Math.max.apply(null, values);
    if (minValue === maxValue) {
        maxValue = minValue + 1;
    }

    var axisColor = opts.axisColor || 'white';
    var gridColor = opts.gridColor || 'darkGray';
    var labelColor = opts.labelColor || 'lightGray';
    var lineColor = opts.lineColor || 'white';

    var yTicks = opts.yTicks || [minValue, maxValue];
    var yFormatter = opts.yFormatter || function(value) {
        return Math.round(value).toString();
    };

    var xLabels = opts.xLabels || [];

    if (title) {
        this._add(new UI.Text({
            position: new Vector2(0, titleOffset),
            size: new Vector2(size.x, 20),
            text: title,
            font: 'gothic-18-bold',
            color: 'white',
            textAlign: 'center'
        }));
    }

    if (subtitle) {
        this._add(new UI.Text({
            position: new Vector2(0, (title ? 20 : 0) + titleOffset),
            size: new Vector2(size.x, 16),
            text: subtitle,
            font: 'gothic-14',
            color: labelColor,
            textAlign: 'center'
        }));
    }

    // Axes
    this._add(new UI.Line({
        position: new Vector2(plotLeft, plotTop),
        position2: new Vector2(plotLeft, plotTop + plotHeight),
        strokeColor: axisColor,
        strokeWidth: 1
    }));

    this._add(new UI.Line({
        position: new Vector2(plotLeft, plotTop + plotHeight),
        position2: new Vector2(plotLeft + plotWidth, plotTop + plotHeight),
        strokeColor: axisColor,
        strokeWidth: 1
    }));

    // Grid + Y labels
    for (var i = 0; i < yTicks.length; i++) {
        var tickValue = yTicks[i];
        var tickY = plotTop + plotHeight - ((tickValue - minValue) / (maxValue - minValue)) * plotHeight;
        this._add(new UI.Line({
            position: new Vector2(plotLeft, tickY),
            position2: new Vector2(plotLeft + plotWidth, tickY),
            strokeColor: gridColor,
            strokeWidth: 1
        }));

        this._add(new UI.Text({
            position: new Vector2(0, tickY - 8),
            size: new Vector2(plotLeft - 4, 16),
            text: yFormatter(tickValue),
            font: 'gothic-14',
            color: labelColor,
            textAlign: 'right'
        }));
    }

    // X labels
    var xDenom = values.length > 1 ? (values.length - 1) : 1;
    for (var j = 0; j < xLabels.length; j++) {
        var label = xLabels[j];
        if (!label || label.index === undefined) {
            continue;
        }
        var x = plotLeft + (label.index / xDenom) * plotWidth;
        this._add(new UI.Text({
            position: new Vector2(x - 16, plotTop + plotHeight + 2),
            size: new Vector2(32, 16),
            text: label.text,
            font: 'gothic-14',
            color: labelColor,
            textAlign: 'center'
        }));
    }

    // Line series
    var xStep = values.length > 1 ? plotWidth / (values.length - 1) : 0;
    for (var k = 0; k < values.length - 1; k++) {
        var v1 = this._clamp(values[k], minValue, maxValue);
        var v2 = this._clamp(values[k + 1], minValue, maxValue);
        var x1 = plotLeft + k * xStep;
        var x2 = plotLeft + (k + 1) * xStep;
        var y1 = plotTop + plotHeight - ((v1 - minValue) / (maxValue - minValue)) * plotHeight;
        var y2 = plotTop + plotHeight - ((v2 - minValue) / (maxValue - minValue)) * plotHeight;

        this._add(new UI.Line({
            position: new Vector2(x1, y1),
            position2: new Vector2(x2, y2),
            strokeColor: lineColor,
            strokeWidth: 2
        }));
    }
};

Graph.prototype._drawEmpty = function(size) {
    this._add(new UI.Text({
        position: new Vector2(0, size.y / 2 - 10),
        size: new Vector2(size.x, 20),
        text: 'No data',
        font: 'gothic-18',
        color: 'white',
        textAlign: 'center'
    }));
};

Graph.prototype._clamp = function(value, minValue, maxValue) {
    if (value === null || value === undefined || isNaN(value)) {
        return minValue;
    }
    return Math.max(minValue, Math.min(maxValue, value));
};

module.exports = Graph;
