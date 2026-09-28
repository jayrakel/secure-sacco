import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../data/setup_controller.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';

class CreateOfficersStep extends ConsumerStatefulWidget {
  final List<String> missingRoles;

  const CreateOfficersStep({super.key, required this.missingRoles});

  @override
  ConsumerState<CreateOfficersStep> createState() => _CreateOfficersStepState();
}

class _OfficerForm {
  final String id;
  String firstName = '';
  String lastName = '';
  String email = '';
  String phone = '';
  String roleId = '';

  _OfficerForm(this.id);
}

class _CreateOfficersStepState extends ConsumerState<CreateOfficersStep> {
  List<dynamic> _roles = [];
  final List<_OfficerForm> _officers = [_OfficerForm(DateTime.now().millisecondsSinceEpoch.toString())];
  String? _savingId;
  final Set<String> _savedIds = {};
  String _error = '';

  @override
  void initState() {
    super.initState();
    _loadRoles();
  }

  Future<void> _loadRoles() async {
    try {
      final roles = await ref.read(setupControllerProvider.notifier).getRoles();
      final officerRoles = [
        'CHAIRPERSON', 'DEPUTY_CHAIRPERSON',
        'SECRETARY', 'DEPUTY_SECRETARY',
        'TREASURER', 'DEPUTY_TREASURER',
        'ACCOUNTANT', 'DEPUTY_ACCOUNTANT',
        'CASHIER', 'DEPUTY_CASHIER',
        'LOAN_OFFICER', 'DEPUTY_LOAN_OFFICER',
      ];
      setState(() {
        _roles = roles.where((r) => officerRoles.contains(r['name'])).toList();
      });
    } catch (e) {
      setState(() => _error = 'Failed to load roles: $e');
    }
  }

  void _addOfficer() {
    setState(() {
      _officers.add(_OfficerForm(DateTime.now().millisecondsSinceEpoch.toString()));
    });
  }

  void _removeOfficer(String id) {
    setState(() {
      _officers.removeWhere((o) => o.id == id);
    });
  }

  Future<void> _saveOfficer(_OfficerForm officer) async {
    if (officer.firstName.isEmpty || officer.lastName.isEmpty || officer.email.isEmpty || officer.roleId.isEmpty) {
      setState(() => _error = 'Please fill in all required fields.');
      return;
    }
    
    setState(() {
      _savingId = officer.id;
      _error = '';
    });
    
    try {
      await ref.read(setupControllerProvider.notifier).createOfficer(
        firstName: officer.firstName,
        lastName: officer.lastName,
        email: officer.email,
        phoneNumber: officer.phone,
        roleId: officer.roleId,
      );
      setState(() {
        _savedIds.add(officer.id);
      });
    } catch (e) {
      setState(() => _error = 'Failed to create officer. Email may already be in use. $e');
    } finally {
      setState(() => _savingId = null);
    }
  }

  String _formatRole(String name) {
    return name.replaceAll('_', ' ').split(' ').map((w) => w.substring(0, 1).toUpperCase() + w.substring(1).toLowerCase()).join(' ');
  }

  @override
  Widget build(BuildContext context) {
    final requiredStillMissing = widget.missingRoles.where((r) {
      return !_officers.any((o) {
        final role = _roles.firstWhere((rl) => rl['id'] == o.roleId, orElse: () => null);
        return role != null && role['name'] == r && _savedIds.contains(o.id);
      });
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Create Officer Accounts', style: AppTextStyles.h3),
        const SizedBox(height: 8),
        const Text(
          'Create accounts for your SACCO officers. Each person will receive an activation email to set their password.',
          style: AppTextStyles.bodyMedium,
        ),
        
        if (requiredStillMissing.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: requiredStillMissing.map((r) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  border: Border.all(color: Colors.amber.shade200),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text('Required: ${_formatRole(r)}', style: TextStyle(color: Colors.amber.shade800, fontSize: 12, fontWeight: FontWeight.bold)),
              )).toList(),
            ),
          ),
          
        const SizedBox(height: 24),

        if (_error.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: AppColors.negative.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.negative.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.warning, color: AppColors.negative, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text(_error, style: AppTextStyles.bodySmall.copyWith(color: AppColors.negative))),
              ],
            ),
          ),

        ..._officers.asMap().entries.map((entry) {
          final idx = entry.key;
          final officer = entry.value;
          final isSaved = _savedIds.contains(officer.id);
          
          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isSaved ? AppColors.positive.withOpacity(0.05) : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: isSaved ? AppColors.positive.withOpacity(0.3) : AppColors.border, width: 2),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Officer ${idx + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
                    Row(
                      children: [
                        if (isSaved)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.positive.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text('Created ✓', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.positive)),
                          ),
                        if (!isSaved && _officers.length > 1)
                          IconButton(
                            icon: const Icon(Icons.delete_outline, color: AppColors.negative, size: 20),
                            onPressed: () => _removeOfficer(officer.id),
                            constraints: const BoxConstraints(),
                            padding: const EdgeInsets.only(left: 8),
                          ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: AppTextField(
                        initialValue: officer.firstName,
                        hintText: 'First name *',
                        enabled: !isSaved,
                        onChanged: (v) => officer.firstName = v,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: AppTextField(
                        initialValue: officer.lastName,
                        hintText: 'Last name *',
                        enabled: !isSaved,
                        onChanged: (v) => officer.lastName = v,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: AppTextField(
                        initialValue: officer.email,
                        hintText: 'Email address *',
                        enabled: !isSaved,
                        onChanged: (v) => officer.email = v,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: AppTextField(
                        initialValue: officer.phone,
                        hintText: 'Phone (+254...)',
                        enabled: !isSaved,
                        onChanged: (v) => officer.phone = v,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: officer.roleId.isEmpty ? null : officer.roleId,
                  decoration: InputDecoration(
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                  hint: const Text('— Select role *'),
                  items: _roles.map<DropdownMenuItem<String>>((r) {
                    return DropdownMenuItem<String>(
                      value: r['id'],
                      child: Text(_formatRole(r['name'])),
                    );
                  }).toList(),
                  onChanged: isSaved ? null : (v) => setState(() => officer.roleId = v ?? ''),
                ),
                if (!isSaved)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        AppButton(
                          text: 'Save Officer',
                          onPressed: _savingId == officer.id ? null : () => _saveOfficer(officer),
                          isLoading: _savingId == officer.id,
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          );
        }),

        AppButton(
          text: 'Add Another Officer',
          icon: Icons.add,
          isOutlined: true,
          onPressed: _addOfficer,
        ),

        const SizedBox(height: 32),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            AppButton(
              text: 'Continue',
              icon: Icons.arrow_forward,
              onPressed: requiredStillMissing.isEmpty ? () => ref.read(setupControllerProvider.notifier).refresh() : null,
            ),
          ],
        ),
        if (requiredStillMissing.isNotEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Align(
              alignment: Alignment.centerRight,
              child: Text('All four required roles must be created before continuing.', style: TextStyle(color: Colors.amber, fontSize: 12)),
            ),
          ),
      ],
    );
  }
}
