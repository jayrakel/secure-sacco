import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:betterlink_connect/features/settings/data/notification_settings_repository.dart';

class NotificationSettingsScreen extends ConsumerStatefulWidget {
  final bool embedded;
  const NotificationSettingsScreen({super.key, this.embedded = false});

  @override
  ConsumerState<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends ConsumerState<NotificationSettingsScreen> {
  bool _isSaving = false;

  Future<void> _updateSetting(
      NotificationSettings currentSettings,
      NotificationSettings newSettings,
  ) async {
    setState(() => _isSaving = true);
    try {
      await ref.read(notificationSettingsRepositoryProvider).updateSettings(newSettings);
      ref.invalidate(notificationSettingsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Settings saved successfully'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save settings: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(notificationSettingsProvider);

    return Scaffold(
      appBar: widget.embedded ? null : AppBar(
        title: const Text('Notification Settings'),
      ),
      body: settingsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Failed to load settings: $err')),
        data: (settings) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Padding(
                padding: EdgeInsets.only(bottom: 16),
                child: Text(
                  'Delivery Channels',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.teal),
                ),
              ),
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    SwitchListTile(
                      title: const Text('Email Notifications'),
                      subtitle: const Text('Receive alerts to your registered email address.'),
                      secondary: const Icon(Icons.email, color: Colors.teal),
                      activeColor: Colors.teal,
                      value: settings.emailEnabled,
                      onChanged: _isSaving ? null : (val) => _updateSetting(settings, settings.copyWith(emailEnabled: val)),
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      title: const Text('SMS Notifications'),
                      subtitle: const Text('Receive urgent alerts via text message.'),
                      secondary: const Icon(Icons.sms, color: Colors.teal),
                      activeColor: Colors.teal,
                      value: settings.smsEnabled,
                      onChanged: _isSaving ? null : (val) => _updateSetting(settings, settings.copyWith(smsEnabled: val)),
                    ),
                  ],
                ),
              ),
              const Divider(height: 32),
              const Padding(
                padding: EdgeInsets.only(bottom: 16),
                child: Text(
                  'Event Preferences',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.teal),
                ),
              ),
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    SwitchListTile(
                      title: const Text('Guarantor Requests'),
                      subtitle: const Text('When someone asks you to guarantee a loan.'),
                      activeColor: Colors.teal,
                      value: settings.notifyOnGuarantorRequests,
                      onChanged: _isSaving ? null : (val) => _updateSetting(settings, settings.copyWith(notifyOnGuarantorRequests: val)),
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      title: const Text('Loan Updates'),
                      subtitle: const Text('Status changes on your loan applications.'),
                      activeColor: Colors.teal,
                      value: settings.notifyOnLoanUpdates,
                      onChanged: _isSaving ? null : (val) => _updateSetting(settings, settings.copyWith(notifyOnLoanUpdates: val)),
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      title: const Text('Transactions'),
                      subtitle: const Text('Alerts for deposits and withdrawals.'),
                      activeColor: Colors.teal,
                      value: settings.notifyOnTransactions,
                      onChanged: _isSaving ? null : (val) => _updateSetting(settings, settings.copyWith(notifyOnTransactions: val)),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
