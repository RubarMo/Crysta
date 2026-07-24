import 'package:flutter/material.dart';
import 'package:dynamic_color/dynamic_color.dart';

import 'locales.dart';
import 'db_service.dart';
import 'views/project_manager_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  DatabaseService.init();
  runApp(const CrystaApp());
}

class CrystaApp extends StatefulWidget {
  const CrystaApp({super.key});

  @override
  State<CrystaApp> createState() => _CrystaAppState();
}

class _CrystaAppState extends State<CrystaApp> {
  ThemeMode _themeMode = ThemeMode.dark;
  String _language = 'ar';
  Color _seedColor = Colors.teal;
  bool _useDynamicColor = false;

  void updateTheme(ThemeMode mode, Color color, bool useDynamicColor) {
    setState(() {
      _themeMode = mode;
      _seedColor = color;
      _useDynamicColor = useDynamicColor;
    });
  }

  void toggleLanguage() {
    setState(() {
      _language = _language == 'ar' ? 'en' : 'ar';
    });
  }

  @override
  Widget build(BuildContext context) {
    return DynamicColorBuilder(
      builder: (ColorScheme? lightDynamic, ColorScheme? darkDynamic) {
        ColorScheme lightScheme;
        ColorScheme darkScheme;

        if (_useDynamicColor && lightDynamic != null && darkDynamic != null) {
          lightScheme = lightDynamic.harmonized();
          darkScheme = darkDynamic.harmonized();
        } else {
          lightScheme = ColorScheme.fromSeed(seedColor: _seedColor, brightness: Brightness.light);
          darkScheme = ColorScheme.fromSeed(seedColor: _seedColor, brightness: Brightness.dark);
        }

        return MaterialApp(
          title: Locales.t('appName', _language),
          debugShowCheckedModeBanner: false,
          themeMode: _themeMode,
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: lightScheme,
            fontFamily: _language == 'ar' ? 'Cairo' : 'Segoe UI',
          ),
          darkTheme: ThemeData(
            useMaterial3: true,
            colorScheme: darkScheme,
            fontFamily: _language == 'ar' ? 'Cairo' : 'Segoe UI',
          ),
          home: ProjectManagerPage(
            onThemeSettingsChanged: updateTheme,
            currentThemeMode: _themeMode,
            currentSeedColor: _seedColor,
            useDynamicColor: _useDynamicColor,
            onLanguageToggle: toggleLanguage,
            language: _language,
          ),
        );
      },
    );
  }
}
