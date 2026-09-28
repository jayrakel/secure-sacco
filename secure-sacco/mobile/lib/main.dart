import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';

void main() {
  runApp(
    const ProviderScope(
      child: BetterlinkConnectApp(),
    ),
  );
}

class BetterlinkConnectApp extends ConsumerWidget {
  const BetterlinkConnectApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Betterlink Connect',
      theme: AppTheme.lightTheme,
      // For now we default to light theme to keep the design system simple,
      // as specified in the Phase 3.5 constraints.
      themeMode: ThemeMode.light,
      routerConfig: router,
    );
  }
}
