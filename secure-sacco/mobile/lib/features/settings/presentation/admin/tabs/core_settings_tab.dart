import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_text_styles.dart';
import '../../../data/settings_dto.dart';
import '../../../data/settings_providers.dart';

class CoreSettingsTab extends ConsumerStatefulWidget {
  final SaccoSettingsResponse settings;
  const CoreSettingsTab({super.key, required this.settings});

  @override
  ConsumerState<CoreSettingsTab> createState() => _CoreSettingsTabState();
}

class _CoreSettingsTabState extends ConsumerState<CoreSettingsTab> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _prefixController;
  late TextEditingController _padLengthController;
  late TextEditingController _regFeeController;
  late TextEditingController _logoUrlController;
  late TextEditingController _faviconUrlController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.settings.saccoName ?? '');
    _prefixController = TextEditingController(text: widget.settings.prefix ?? '');
    _padLengthController = TextEditingController(text: widget.settings.padLength?.toString() ?? '7');
    _regFeeController = TextEditingController(text: widget.settings.registrationFee?.toString() ?? '0');
    _logoUrlController = TextEditingController(text: widget.settings.logoUrl ?? '');
    _faviconUrlController = TextEditingController(text: widget.settings.faviconUrl ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _prefixController.dispose();
    _padLengthController.dispose();
    _regFeeController.dispose();
    _logoUrlController.dispose();
    _faviconUrlController.dispose();
    super.dispose();
  }

  void _save() async {
    if (!_formKey.currentState!.validate()) return;
    
    final request = UpdateCoreRequest(
      saccoName: _nameController.text.trim(),
      prefix: _prefixController.text.trim(),
      padLength: int.tryParse(_padLengthController.text.trim()) ?? 7,
      registrationFee: double.tryParse(_regFeeController.text.trim()) ?? 0.0,
      logoUrl: _logoUrlController.text.trim(),
      faviconUrl: _faviconUrlController.text.trim(),
    );

    await ref.read(settingsNotifierProvider.notifier).updateCoreSettings(request);
    
    final state = ref.read(settingsNotifierProvider);
    if (!mounted) return;
    if (state.hasError) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error.toString()), backgroundColor: AppColors.negative));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Core settings updated successfully'), backgroundColor: AppColors.positive));
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
            const Text('Identity', style: AppTextStyles.h3),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'SACCO Name', border: OutlineInputBorder()),
              validator: (val) => val == null || val.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _prefixController,
                    decoration: const InputDecoration(labelText: 'Member Prefix (3 chars)', border: OutlineInputBorder()),
                    maxLength: 3,
                    validator: (val) {
                      if (val == null || val.isEmpty) return 'Required';
                      if (val.length != 3) return 'Must be exactly 3 characters';
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _padLengthController,
                    decoration: const InputDecoration(labelText: 'Pad Length', border: OutlineInputBorder()),
                    keyboardType: TextInputType.number,
                    validator: (val) => val == null || int.tryParse(val) == null ? 'Invalid number' : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _regFeeController,
              decoration: const InputDecoration(labelText: 'Registration Fee', border: OutlineInputBorder(), prefixText: 'KES '),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (val) => val == null || double.tryParse(val) == null ? 'Invalid amount' : null,
            ),
            const SizedBox(height: 32),
            const Text('Branding', style: AppTextStyles.h3),
            const SizedBox(height: 16),
            TextFormField(
              controller: _logoUrlController,
              decoration: const InputDecoration(labelText: 'Logo URL', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _faviconUrlController,
              decoration: const InputDecoration(labelText: 'Favicon URL', border: OutlineInputBorder()),
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
                    : const Text('Save Core Settings', style: TextStyle(color: Colors.white, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
