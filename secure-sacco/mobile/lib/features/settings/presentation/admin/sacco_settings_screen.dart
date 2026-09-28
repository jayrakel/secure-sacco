import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/settings_providers.dart';
import 'tabs/core_settings_tab.dart';
import 'tabs/security_settings_tab.dart';
import 'tabs/communication_settings_tab.dart';
import 'tabs/feature_flags_tab.dart';
import 'tabs/schedules_settings_tab.dart';

class SaccoSettingsScreen extends ConsumerWidget {
  const SaccoSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsAsync = ref.watch(saccoSettingsProvider);

    return DefaultTabController(
      length: 5,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('System Settings', style: AppTextStyles.h2),
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.textPrimary,
          elevation: 1,
          bottom: const TabBar(
            isScrollable: true,
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textSecondary,
            indicatorColor: AppColors.primary,
            tabs: [
              Tab(text: 'Identity & Core'),
              Tab(text: 'Security & Access'),
              Tab(text: 'Communication'),
              Tab(text: 'Schedules & Meetings'),
              Tab(text: 'Feature Flags'),
            ],
          ),
        ),
        body: settingsAsync.when(
          data: (settings) {
            return TabBarView(
              children: [
                CoreSettingsTab(settings: settings),
                SecuritySettingsTab(settings: settings),
                CommunicationSettingsTab(settings: settings),
                SchedulesSettingsTab(settings: settings),
                FeatureFlagsTab(settings: settings),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: AppColors.negative, size: 48),
                const SizedBox(height: 16),
                Text('Failed to load settings', style: AppTextStyles.h3),
                const SizedBox(height: 8),
                Text(err.toString(), style: AppTextStyles.bodyMedium, textAlign: TextAlign.center),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => ref.refresh(saccoSettingsProvider),
                  child: const Text('Retry'),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}
