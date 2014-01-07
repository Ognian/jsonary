// Display-order extension
Jsonary.extendSchema({
	displayOrder: function () {
		return this.data.propertyValue("displayOrder");
	}
});
Jsonary.extendSchemaList({
	displayOrder: function () {
		var displayOrder = null;
		this.each(function (index, schema) {
			var value = schema.displayOrder();
			if (value != null && (displayOrder == null || value < displayOrder)) {
				displayOrder = value;
			}
		});
		return displayOrder;
	}
});

// hidden extension (non-standard keyword, suggested by Ognian)
Jsonary.extendSchema({
    hidden: function () {
        return !!this.data.propertyValue("hidden");
    }
});
Jsonary.extendSchemaList({
    hidden: function () {
        var hidden = false;
        this.each(function (index, schema) {
            hidden = hidden || schema.hidden();
        });
        return hidden;
    }
});

// Display/edit objects, using displayOrder for ordering
Jsonary.render.register({	
	renderHtml: function (data, context) {
		var uiState = context.uiState;
		var schemas = data.schemas();

		var keysList = [];
		var keysDisplayOrder = {};
		var guaranteedKeys = data.readOnly() ? [] : schemas.definedProperties();			
		data.properties(guaranteedKeys, function (key, subData) {
                if(!(subData.schemas().hidden() || schemas.propertySchemas(key).hidden())){
                    keysList.push(key);
        			keysDisplayOrder[key] = (subData.schemas().displayOrder() || schemas.propertySchemas(key).displayOrder());
                }
		}, true);
		keysList.sort(function (keyA, keyB) {
			if (keysDisplayOrder[keyA] == null) {
				if (keysDisplayOrder[keyB] == null) {
					return 0;
				}
				return 1;
			} else if (keysDisplayOrder[keyB] == null) {
				return -1;
			}
			return keysDisplayOrder[keyA] - keysDisplayOrder[keyB];
		});
		
		var result = "";
		result += '<fieldset class="json-object-outer">';
		var title = data.schemas().title();
		if (title) {
			result += '<legend class="json-object-title">' + Jsonary.escapeHtml(title) + '</legend>';
		}
		result += '<table class="json-object"><tbody>';
        var drawProperty = function (key, subData) {
            if (subData.defined()) {
                var title = subData.schemas().fixed().title();
            } else {
                var schemas = subData.parent().schemas().propertySchemas(subData.parentKey());
                if (schemas.readOnly()) {
                    return;
                }
                var title = schemas.title();
            }
            result += '<tr class="json-object-pair">';
            if (title == "") {
                result +=	'<td class="json-object-key"><div class="json-object-key-title">' + escapeHtml(key) + '</div></td>';
            } else {
                result +=	'<td class="json-object-key"><div class="json-object-key-title">' + escapeHtml(key) + '</div><div class="json-object-key-text">' + escapeHtml(title) + '</div></td>';
            }
            result += '<td class="json-object-value">' + context.renderHtml(subData) + '</td>';
            result += '</tr>';
        }
        if (!data.readOnly()) {
            var schemas = data.schemas();
            var knownProperties = schemas.knownProperties();

            var shouldHideUndefined = knownProperties.length - schemas.requiredProperties().length > 5;

            var maxProperties = schemas.maxProperties();
            var canAdd = (maxProperties == null || maxProperties > schemas.keys().length);
            data.properties(knownProperties, function (key, subData) {
                if ((!shouldHideUndefined && canAdd) || subData.defined()) {
                    drawProperty(key, subData);
                }
            }, drawProperty);

            if (canAdd && (schemas.allowedAdditionalProperties() || shouldHideUndefined)) {
                if (context.uiState.addInput) {
                    result += '<tr class="json-object-pair"><td class="json-object-key"><div class="json-object-key-text">';
                    result += context.actionHtml('<span class="button">add</span>', "add-confirm");
                    result += '<br>';
                    result += '</div></td><td>';
                    if (shouldHideUndefined) {
                        var missingKeys = [];
                        data.properties(knownProperties, function (key, subData) {
                            if (!subData.defined()) {
                                missingKeys.push(key);
                            }
                        });
                        result += '<select name="' + context.inputNameForAction('select-preset') + '">';
                        if (schemas.allowedAdditionalProperties()) {
                            result += '<option value="custom">Enter your own:</option>';
                        }
                        result += '<optgroup label="Known properties">';
                        missingKeys.sort();
                        for (var i = 0; i < missingKeys.length; i++) {
                            var key = missingKeys[i];
                            if (key == context.uiState.addInputSelect) {
                                result += '<option value="key-' + Jsonary.escapeHtml(key) + '" selected>' + Jsonary.escapeHtml(key) + '</option>';
                            } else {
                                result += '<option value="key-' + Jsonary.escapeHtml(key) + '">' + Jsonary.escapeHtml(key) + '</option>';
                            }
                        }
                        result += '</optgroup></select>';
                    }
                    if (schemas.allowedAdditionalProperties() && (!shouldHideUndefined || context.uiState.addInputSelect == null)) {
                        result += '<input type="text" class="json-object-add-input" name="' + context.inputNameForAction("add-input") + '" value="' + Jsonary.escapeHtml(context.uiState.addInputValue) + '"></input>';
                        result += context.actionHtml('<span class="button">cancel</span>', "add-cancel");
                        if (data.property(context.uiState.addInputValue).defined()) {
                            result += '<span class="warning"><code>' + Jsonary.escapeHtml(context.uiState.addInputValue) + '</code> already exists</span>';
                        }
                    } else {
                        result += context.actionHtml('<span class="button">cancel</span>', "add-cancel");
                    }
                    result += '</td></tr>';
                } else {
                    result += '<tr class="json-object-pair"><td class="json-object-key"><div class="json-object-key-text">';
                    result += context.actionHtml('<span class="button">add</span>', "add-input");
                    result += '</div></td><td></td></tr>';
                }
            }
        } else {
            var knownProperties = data.schemas().knownProperties();
            data.properties(knownProperties, function (key, subData) {
                if (subData.defined()) {
                    drawProperty(key, subData);
                }
            }, true);
        }
        result += '</table>';
        result += '</fieldset>';
        return result;
    },
    action: function (context, actionName, arg1) {
        var data = context.data;
        if (actionName == "select-preset") {
            if (arg1 == 'custom') {
                delete context.uiState.addInputSelect;
            } else {
                var key = arg1;
                context.uiState.addInputSelect = key.substring(4);
            }
            return true;
        } else if (actionName == "add-input") {
            context.uiState.addInput = true;
            context.uiState.addInputValue = (arg1 == undefined) ? "key" : arg1;
            return true;
        } else if (actionName == "add-cancel") {
            delete context.uiState.addInput;
            delete context.uiState.addInputValue;
            delete context.uiState.addInputSelect;
            return true;
        } else if (actionName == "add-confirm") {
            var key = (context.uiState.addInputSelect != null) ? context.uiState.addInputSelect : context.uiState.addInputValue;
            if (key != null && !data.property(key).defined()) {
                delete context.uiState.addInput;
                delete context.uiState.addInputValue;
                delete context.uiState.addInputSelect;
                data.schemas().createValueForProperty(key, function (newValue) {
                    data.property(key).setValue(newValue);
                });
            }
        }
    },
    filter: {
        type: 'object'
    }
});
