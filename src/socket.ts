/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import httpStatus from 'http-status';
import AppError from './app/error/AppError';
import getUserDetailsFromToken from './app/helpers/getUserDetailsFromToken';

const initializeSocketIO = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  // Online users
  const onlineUser = new Set();

  io.on('connection', async socket => {
    console.log('connected', socket?.id);

    try {
      //----------------------user token get from front end-------------------------//
      const token =
        socket.handshake.auth?.token || socket.handshake.headers?.token;
      //----------------------check Token and return user details-------------------------//
      const user: any = await getUserDetailsFromToken(token);
      if (!user) {
        // io.emit('io-error', {success:false, message:'invalid Token'});
        throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid token');
      }

      socket.join(user?._id?.toString());

      //----------------------user id set in online array-------------------------//
      onlineUser.add(user?._id?.toString());

      socket.on('check', (data, callback) => {
        callback({ success: true });
      });

      socket.on(
        'getLocation',
        async (
          messageData: { latitude: number; longitude: number },
          callback: any,
        ) => {
          try {
            const data = messageData;
            console.log(
              '🚀 ~ initializeSocketIO ~ user._id:',
              user._id?.toString(),
            );
            console.log('🚀 ~ initializeSocketIO ~ data:', data);

            // console.log('locationd--', data);
            const key = 'serverToSendLocation::' + user._id?.toString();
            console.log(key);
            return io.emit(key, data);
          } catch (error: any) {
            console.log('🚀 ~ error:', error);
          }
        },
      );
      //-----------------------Disconnect------------------------//
      socket.on('disconnect', () => {
        onlineUser.delete(user?._id?.toString());
        io.emit('onlineUser', Array.from(onlineUser));
        console.log('disconnect user ', socket.id);
      });
    } catch (error) {
      console.error('-- socket.io connection error --', error);
    }
  });

  return io;
};

export default initializeSocketIO;
