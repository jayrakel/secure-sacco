import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/app_text_styles.dart';
import '../../../data/settings_dto.dart';
import '../../../data/settings_providers.dart';

class FeatureFlagsTab extends ConsumerStatefulWidget {
  final SaccoSettingsResponse settings;
  const FeatureFlagsTab({super.key, required this.settings});

  @override
  ConsumerState<FeatureFlagsTab> createState() => _FeatureFlagsTabState();
}

class _FeatureFlagsTabState extends ConsumerState<FeatureFlagsTab> {
  late Map<String, bool> _flags;

  final Map<String, String> _knownModules = {
    'LOANS': 'Loans Management',
    'SAVINGS': 'Savings Management',
    'ACCOUNTING': 'Accounting & GL',
    'DIVIDENDS': 'Dividends Processing',
    'PORTAL': 'Member Portal',
  };

  @override
  void initState() {
    super.initState();
    // Default fallback if map is empty
    _flags = {
      'LOANS': true,
      'SAVINGS': true,
      'ACCOUNTING': false,
      'DIVIDENDS': false,
      'PORTAL': false,
    };
    
    if (widget.settings.enabledModules != null) {
      widget.settings.enabledModules!.forEach((key, value) {
        if (value is bool) {
          _flags[key] = value;
        }
      });
    }
  }

  void _save() async {
    final request = UpdateFlagsRequest(flags: _flags);
    await ref.read(settingsNotifierProvider.notifier).updateFeatureFlags(request);
    
    final state = ref.read(settingsNotifierProvider);
    if (!mounted) return;
    if (state.hasError) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.error.toString()), backgroundColor: AppColors.negative));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Feature flags updated successfully'), backgroundColor: AppColors.positive));
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(settingsNotifierProvider);
    final isLoading = state.isLoading;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Enabled Modules', style: AppTextStyles.h3),
          const SizedBox(height: 8),
          const Text('Toggle which modules are active for the SACCO.', style: AppTextStyles.bodyMedium),
          const SizedBox(height: 16),
          ..._flags.keys.map((key) {
            final name = _knownModules[key] ?? key;
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              child: SwitchListTile(
                title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text('Module ID: $key'),
                value: _flags[key] ?? false,
                activeColor: AppColors.primary,
                onChanged: (val) {
                  setState(() {
                    _flags[key] = val;
                  });
                },
              ),
            );
          }).toList(),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: isLoading ? null : _save,
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              child: isLoading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Save Feature Flags', style: TextStyle(color: Colors.white, fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }
}
