import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/main.dart';
import 'package:mobile/core/networking/cookie_manager_provider.dart';
import 'dart:io';

void main() {
  setUpAll(() {
    // Allow real HTTP requests in tests
    HttpOverrides.global = null;
  });

  testWidgets('Authentication flow against real backend', (WidgetTester tester) async {
    // 1. Build the app
    await tester.pumpWidget(const ProviderScope(child: BetterlinkConnectApp()));
    await tester.pumpAndSettle();

    // The app should start on the Login screen
    expect(find.text('Login'), findsOneWidget);

    // 2. Clear any existing cookies just in case
    final context = tester.element(find.byType(BetterlinkConnectApp));
    final container = ProviderScope.containerOf(context);
    final cookieJar = container.read(cookieJarProvider);
    await cookieJar.deleteAll();

    // 3. Enter valid credentials (from backend default admin)
    await tester.enterText(find.byType(TextField).first, 'admin@jaytechwave.org');
    await tester.enterText(find.byType(TextField).last, 'Admin@12345678');
    await tester.pumpAndSettle();

    // 4. Tap login
    await tester.tap(find.text('Login'));
    // Wait for network requests to finish
    bool found = false;
    for (int i = 0; i < 50; i++) {
      await tester.pump(const Duration(milliseconds: 100));
      if (find.text('Two-Factor Authentication').evaluate().isNotEmpty || 
          find.text('Admin Dashboard').evaluate().isNotEmpty) {
        found = true;
        break;
      }
    }
    
    // 5. Check if it navigates to OTP screen or Dashboard depending on MFA requirement
    final isOnDashboard = find.text('Admin Dashboard').evaluate().isNotEmpty;
    
    expect(found, isTrue, reason: 'Should navigate to OTP or Admin Dashboard');

    if (isOnDashboard) {
      // 6. Test logout (verifies CSRF since logout is a POST)
      await tester.tap(find.byIcon(Icons.logout));
      await tester.pump(const Duration(seconds: 2));
      await tester.pumpAndSettle();
      
      // Should be back to Login
      expect(find.text('Login'), findsOneWidget);
    }
  });
}

