/**
 * HourlyValueListPage - Generic hourly values list page (condensed window)
 */

var UI = require('ui');
var Vector2 = require('vector2');
var Feature = require('platform/feature');
var helpers = require('app/helpers');

var HourlyValueListPage = {
    window: null,
    _elements: null,
    _state: null,

    /**
     * Show the hourly list page
     * @param {Object} options
     * @param {string} options.title
     * @param {Array} options.periods
     * @param {Function} options.valueTextForPeriod
     */
    show: function(options) {
        var log = helpers.log;
        var title = options && options.title ? options.title : 'Hourly';
        var periods = options && options.periods ? options.periods : [];
        var valueTextForPeriod = options && options.valueTextForPeriod
            ? options.valueTextForPeriod
            : function() { return '--'; };

        log('HourlyValueListPage: Showing ' + title);

        if (!periods.length) {
            this._showNoData();
            return;
        }

        this.window = new UI.Window({
            backgroundColor: 'black',
            status: false
        });
        this._elements = [];
        this._state = {
            title: title,
            periods: periods.slice(0, 24),
            valueTextForPeriod: valueTextForPeriod,
            page: 0
        };

        this.window.on('click', 'up', this._onUp.bind(this));
        this.window.on('click', 'down', this._onDown.bind(this));

        this._render();
        this.window.show();
    },

    _onUp: function() {
        if (!this._state) {
            return;
        }
        if (this._state.page > 0) {
            this._state.page -= 1;
            this._render();
        }
    },

    _onDown: function() {
        if (!this._state) {
            return;
        }
        var totalPages = this._getTotalPages();
        if (this._state.page < totalPages - 1) {
            this._state.page += 1;
            this._render();
        }
    },

    _getTotalPages: function() {
        var size = this.window.size();
        var lineHeight = 16;
        var titleHeight = 20;
        var roundInset = this._getRoundInset(size);
        var titleOffset = roundInset ? Math.floor(roundInset / 2) : 0;
        var availableHeight = size.y - titleHeight - 2 - titleOffset;
        var linesPerPage = Math.max(1, Math.floor(availableHeight / lineHeight));
        if (Feature.round && Feature.round()) {
            linesPerPage = Math.max(1, linesPerPage - 2);
        }
        return Math.ceil(this._state.periods.length / linesPerPage);
    },

    _render: function() {
        this._clear();
        var size = this.window.size();
        var titleHeight = 20;
        var lineHeight = 16;
        var paddingTop = 2;
        var midX = Math.floor(size.x / 2);
        var gap = 4;
        var timeWidth = Math.max(10, midX - gap);
        var valueX = midX + gap;
        var valueWidth = Math.max(10, size.x - valueX);
        var roundInset = this._getRoundInset(size);
        var titleOffset = roundInset ? Math.floor(roundInset / 2) : 0;

        this._add(new UI.Text({
            position: new Vector2(0, titleOffset),
            size: new Vector2(size.x, titleHeight),
            text: this._state.title,
            font: 'gothic-18-bold',
            color: 'white',
            textAlign: 'center'
        }));

        var availableHeight = size.y - titleHeight - paddingTop - titleOffset;
        var linesPerPage = Math.max(1, Math.floor(availableHeight / lineHeight));
        if (Feature.round && Feature.round()) {
            linesPerPage = Math.max(1, linesPerPage - 2);
        }
        var startIndex = this._state.page * linesPerPage;
        var endIndex = Math.min(this._state.periods.length, startIndex + linesPerPage);

        for (var i = startIndex; i < endIndex; i++) {
            var line = i - startIndex;
            var y = titleHeight + paddingTop + titleOffset + line * lineHeight;
            var period = this._state.periods[i];

            this._add(new UI.Text({
                position: new Vector2(0, y),
                size: new Vector2(timeWidth, lineHeight),
                text: helpers.formatHourLabel(period.startTime),
                font: 'gothic-14-bold',
                color: 'white',
                textAlign: 'right'
            }));

            this._add(new UI.Text({
                position: new Vector2(valueX, y),
                size: new Vector2(valueWidth, lineHeight),
                text: this._state.valueTextForPeriod(period),
                font: 'gothic-14',
                color: 'white',
                textAlign: 'left'
            }));
        }
    },

    _add: function(element) {
        this._elements.push(element);
        this.window.add(element);
    },

    _clear: function() {
        if (!this._elements) {
            return;
        }
        for (var i = 0; i < this._elements.length; i++) {
            this._elements[i].remove();
        }
        this._elements = [];
    },

    _getRoundInset: function(size) {
        if (!Feature.round || !Feature.round()) {
            return 0;
        }
        var diameter = Math.min(size.x, size.y);
        var inset = (diameter - (diameter / Math.SQRT2)) / 2;
        return Math.ceil(inset);
    },

    _showNoData: function() {
        var card = new UI.Card({
            title: 'No Hourly Data',
            body: 'Hourly data not available.\nPlease try again.'
        });
        card.show();
    }
};

module.exports = HourlyValueListPage;
