import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  Divider,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState('http://192.168.1.100:3000');
  const [token, setToken] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  const showMessage = (msg) => {
    setMessage(msg);
    setVisible(true);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showMessage('أدخل اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${serverUrl}/admin/login`, {
        username,
        password,
      });

      setToken(response.data.token);
      await AsyncStorage.setItem('adminToken', response.data.token);
      showMessage('تم تسجيل الدخول بنجاح ✅');
      setPassword('');
    } catch (error) {
      showMessage('خطأ: بيانات دخول خاطئة');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    if (!token) {
      showMessage('يجب تسجيل الدخول أولاً');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${serverUrl}/records`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setRecords(response.data);
      showMessage(`تم تحميل ${response.data.length} سجل`);
    } catch (error) {
      showMessage('خطأ في تحميل السجلات');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setRecords([]);
    setUsername('');
    setPassword('');
    AsyncStorage.removeItem('adminToken');
    showMessage('تم تسجيل الخروج');
  };

  const renderRecord = ({ item }) => (
    <Card style={styles.recordCard}>
      <Card.Content>
        <Text variant="titleSmall" style={styles.recordTitle}>
          {item.email}
        </Text>
        <Divider style={styles.recordDivider} />
        <Text style={styles.recordText}>
          الموافقة: {item.consent_given ? '✅ نعم' : '❌ لا'}
        </Text>
        <Text style={styles.recordText}>
          IP: {item.client_ip || 'غير متوفر'}
        </Text>
        <Text style={styles.recordText}>
          التاريخ: {new Date(item.received_at).toLocaleString('ar')}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView style={styles.container}>
      {!token ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              تسجيل دخول المدير
            </Text>
            <Divider style={styles.divider} />

            <TextInput
              label="عنوان السيرفر"
              value={serverUrl}
              onChangeText={setServerUrl}
              mode="outlined"
              style={styles.input}
              disabled={loading}
            />

            <TextInput
              label="اسم المستخدم"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              style={styles.input}
              disabled={loading}
            />

            <TextInput
              label="كلمة المرور"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
              disabled={loading}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              تسجيل الدخول
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.welcomeText}>
                مرحباً بك {username} 👋
              </Text>
              <Button
                mode="outlined"
                onPress={fetchRecords}
                loading={loading}
                disabled={loading}
                style={styles.button}
              >
                تحميل السجلات
              </Button>
              <Button
                mode="text"
                onPress={handleLogout}
                style={styles.button}
              >
                تسجيل الخروج
              </Button>
            </Card.Content>
          </Card>

          {loading && <ActivityIndicator style={styles.loader} />}

          {records.length > 0 && (
            <>
              <Text style={styles.recordsCount}>
                إجمالي السجلات: {records.length}
              </Text>
              <FlatList
                data={records}
                renderItem={renderRecord}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            </>
          )}
        </>
      )}

      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
      >
        {message}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginVertical: 8,
  },
  welcomeText: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 20,
  },
  recordsCount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 12,
    textAlign: 'center',
  },
  recordCard: {
    marginBottom: 12,
  },
  recordTitle: {
    fontWeight: 'bold',
    color: '#6200ee',
  },
  recordDivider: {
    marginVertical: 8,
  },
  recordText: {
    fontSize: 12,
    marginVertical: 2,
  },
});

export default AdminScreen;
