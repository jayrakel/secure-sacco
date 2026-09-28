import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../data/asset_dto.dart';
import '../data/asset_providers.dart';

class UpdateAssetScreen extends ConsumerStatefulWidget {
  final AssetResponse asset;

  const UpdateAssetScreen({super.key, required this.asset});

  @override
  ConsumerState<UpdateAssetScreen> createState() => _UpdateAssetScreenState();
}

class _UpdateAssetScreenState extends ConsumerState<UpdateAssetScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _serialController;
  late final TextEditingController _descController;
  late final TextEditingController _locationController;
  late final TextEditingController _supplierController;
  DateTime? _warrantyExpiry;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.asset.assetName);
    _serialController = TextEditingController(text: widget.asset.serialNumber);
    _descController = TextEditingController(text: widget.asset.description);
    _locationController = TextEditingController(text: widget.asset.location);
    _supplierController = TextEditingController(text: widget.asset.supplier);
    _warrantyExpiry = widget.asset.warrantyExpiry;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _serialController.dispose();
    _descController.dispose();
    _locationController.dispose();
    _supplierController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _warrantyExpiry ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2101),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: Theme.of(context).primaryColor,
              onPrimary: Colors.white,
              onSurface: Colors.black,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _warrantyExpiry = picked;
      });
    }
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      final request = UpdateAssetRequest(
        assetName: _nameController.text.trim(),
        serialNumber: _serialController.text.trim().isEmpty ? null : _serialController.text.trim(),
        description: _descController.text.trim().isEmpty ? null : _descController.text.trim(),
        location: _locationController.text.trim().isEmpty ? null : _locationController.text.trim(),
        supplier: _supplierController.text.trim().isEmpty ? null : _supplierController.text.trim(),
        warrantyExpiry: _warrantyExpiry != null ? DateFormat('yyyy-MM-dd').format(_warrantyExpiry!.toLocal()) : null,
      );

      final success = await ref.read(assetControllerProvider.notifier).updateAsset(widget.asset.id, request);

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Asset updated successfully')),
        );
        ref.invalidate(assetDetailProvider(widget.asset.id));
        ref.invalidate(assetsProvider);
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(assetControllerProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: const Text('Update Asset'),
        elevation: 0,
      ),
      body: state.when(
        data: (_) => _buildForm(),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _buildForm(error: error.toString()),
      ),
    );
  }

  Widget _buildForm({String? error}) {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(20.0),
        children: [
          if (error != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.error_outline, color: Colors.red.shade700),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      error,
                      style: TextStyle(color: Colors.red.shade700),
                    ),
                  ),
                ],
              ),
            ),
          
          Text(
            'Asset Information',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.blue.shade700),
          ),
          const SizedBox(height: 16),
          _buildTextField(
            controller: _nameController,
            label: 'Asset Name',
            icon: Icons.inventory,
            validator: (value) => value == null || value.isEmpty ? 'Required' : null,
          ),
          const SizedBox(height: 16),
          _buildTextField(
            controller: _serialController,
            label: 'Serial Number',
            icon: Icons.qr_code,
            isOptional: true,
          ),
          const SizedBox(height: 16),
          _buildTextField(
            controller: _locationController,
            label: 'Location',
            icon: Icons.location_on,
            isOptional: true,
          ),
          const SizedBox(height: 16),
          _buildTextField(
            controller: _supplierController,
            label: 'Supplier',
            icon: Icons.business,
            isOptional: true,
          ),
          const SizedBox(height: 16),
          _buildDatePickerTile(
            title: 'Warranty Expiry',
            date: _warrantyExpiry,
            onTap: () => _selectDate(context),
            isOptional: true,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _descController,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: 'Description (Optional)',
              alignLabelWithHint: true,
              filled: true,
              fillColor: Colors.grey.shade50,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: _submit,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              backgroundColor: Theme.of(context).primaryColor,
              foregroundColor: Colors.white,
            ),
            child: const Text('Update Asset', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool isOptional = false,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: isOptional ? '$label (Optional)' : label,
        filled: true,
        fillColor: Colors.grey.shade50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        prefixIcon: Icon(icon, color: Colors.grey),
      ),
      validator: validator,
    );
  }

  Widget _buildDatePickerTile({
    required String title,
    required DateTime? date,
    required VoidCallback onTap,
    bool isOptional = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_today, color: Colors.grey),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isOptional ? '$title (Optional)' : title,
                    style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    date != null ? DateFormat('MMM d, yyyy').format(date.toLocal()) : 'Not set',
                    style: const TextStyle(fontSize: 16),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
