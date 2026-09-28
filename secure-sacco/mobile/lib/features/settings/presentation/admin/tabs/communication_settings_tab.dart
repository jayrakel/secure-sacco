import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_text_styles.dart';
import '../../../data/settings_dto.dart';
import '../../../data/settings_providers.dart';

class CommunicationSettingsTab extends ConsumerStatefulWidget {
  final SaccoSettingsResponse settings;
  const CommunicationSettingsTab({super.key, required this.settings});

  @override
  ConsumerState<CommunicationSettingsTab> createState() => _CommunicationSettingsTabState();
}

class _CommunicationSettingsTabState extends ConsumerState<CommunicationSettingsTab> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _smtpFromName;
  late TextEditingController _supportEmail;

  @override
  void initState() {
    super.initState();
    _smtpFromName = TextEditingController(text: widget.settings.smtpFromName ?? 'Secure SACCO');
    _supportEmail = TextEditingController(text: widget.settings.supportEmail ?? '');
  }

  @override
  void dispose() {
    _smtpFromName.dispose();
    _supportEmail.dispose();
    super.dispose();
  }

  void _save() async {
    if (!_formKey.currentState!.validate()) return;
    
    final request = UpdateCommunicationRequest(
      smtpFromName: _smtpFromName.text.trim(),
      supportEmail: _supportEmail.text.trim(),
    );

    await ref.read(settingsNotifierProvider.notifier).updateCommunicationSettings(request);
    
    final state = ref.read(settingsNotifierProvider);
    if (!mounted) return;
    if (state.hasError) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error.toString()), backgroundColor: AppColors.negative));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Communication settings updated successfully'), backgroundColor: AppColors.positive));
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(settingsNotifierProvider);
    final isLoading = state.isLoading;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Email Notifications', style: AppTextStyles.h3),
            const SizedBox(height: 16),
            TextFormField(
              controller: _smtpFromName,
              decoration: const InputDecoration(labelText: 'Sender Name (From Name)', border: OutlineInputBorder()),
              validator: (val) => val == null || val.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _supportEmail,
              decoration: const InputDecoration(labelText: 'Support Email', border: OutlineInputBorder()),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: isLoading ? null : _save,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                child: isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Save Communication Settings', style: TextStyle(color: Colors.white, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
