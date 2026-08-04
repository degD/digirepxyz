const { withMainActivity } = require('@expo/config-plugins');

const IMPORT_MARKER = 'ChordProIntent';
const LOG_ENABLED = false;

/**
 * Set LOG_ENABLED to true before building Android to add native incoming-intent logs.
 * Set it to false to leave MainActivity unchanged.
 * Used when developing 'open with' feature.
 */
module.exports = function withChordProIntentLogging(config) {
  if (!LOG_ENABLED) {
    return config;
  }

  return withMainActivity(config, (androidConfig) => {
    let contents = androidConfig.modResults.contents;
    if (androidConfig.modResults.language !== 'kt' || contents.includes(IMPORT_MARKER)) {
      return androidConfig;
    }

    contents = contents.replace(
      'import android.os.Bundle',
      'import android.content.Intent\nimport android.os.Bundle\nimport android.util.Log'
    );
    contents = contents.replace(
      '    super.onCreate(null)\n  }',
      '    super.onCreate(null)\n    logIncomingIntent("onCreate", intent)\n  }\n\n' +
        '  override fun onNewIntent(intent: Intent) {\n' +
        '    Log.i("ChordProIntent", "onNewIntent received")\n' +
        '    logIncomingIntent("onNewIntent", intent)\n' +
        '    super.onNewIntent(intent)\n' +
        '  }\n\n' +
        '  private fun logIncomingIntent(source: String, incomingIntent: Intent?) {\n' +
        '    Log.i(\n' +
        '      "ChordProIntent",\n' +
        '      "$source action=${incomingIntent?.action} type=${incomingIntent?.type} " +\n' +
        '        "data=${incomingIntent?.data} flags=${incomingIntent?.flags} " +\n' +
        '        "categories=${incomingIntent?.categories}"\n' +
        '    )\n' +
        '  }'
    );

    androidConfig.modResults.contents = contents;
    return androidConfig;
  });
};
