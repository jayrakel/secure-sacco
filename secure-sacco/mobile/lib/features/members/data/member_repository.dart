import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/networking/api_client.dart';
import 'member_dto.dart';

class MemberRepository {
  final Dio _dio;

  MemberRepository(this._dio);

  Future<PaginatedMemberResponse> getMembers({String? query, String? status, int page = 0, int size = 10}) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'size': size,
    };
    if (query != null && query.isNotEmpty) {
      queryParams['q'] = query;
    }
    if (status != null && status.isNotEmpty && status != 'ALL') {
      queryParams['status'] = status;
    }

    final response = await _dio.get('/api/v1/members', queryParameters: queryParams);
    return PaginatedMemberResponse.fromJson(response.data);
  }

  Future<MemberDto> getMember(String id) async {
    final response = await _dio.get('/api/v1/members/$id');
    return MemberDto.fromJson(response.data);
  }

  Future<MemberDto> createMember(CreateMemberRequestDto request) async {
    final response = await _dio.post('/api/v1/members', data: request.toJson());
    return MemberDto.fromJson(response.data);
  }

  Future<MemberDto> updateMemberStatus(String id, String status) async {
    final response = await _dio.patch('/api/v1/members/$id/status', data: {'status': status});
    return MemberDto.fromJson(response.data);
  }
}

final memberRepositoryProvider = Provider<MemberRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return MemberRepository(dio);
});
