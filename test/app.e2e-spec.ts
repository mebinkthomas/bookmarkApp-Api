import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import * as pactum from 'pactum';
import { AuthDto } from '../src/auth/dto';
import { EditUserDto } from '../src/user/dto/edit-user.dto';
import { CreateBookmarkDto, EditBookmarkDto } from '../src/bookmark/dto';

describe('App e2e', ()=>{

  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll( async()=>{

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    await app.listen(5000);

    prisma = app.get(PrismaService);
    await prisma.cleanDb();

    pactum.request.setBaseUrl('http://localhost:5000');
  });

  afterAll(()=>{
    app.close();
  });
  
  
  describe('Auth', ()=>{
    const dto:AuthDto = {
      email:'test@test.com',
      password: 'test1234'
    }
    describe('Signup', ()=>{
      it('should throw if email is empty', ()=>{
        return pactum.spec().post('/auth/signup').withBody({ password: dto.password }).expectStatus(400);
      });
      it('should throw if password is empty', ()=>{
        return pactum.spec().post('/auth/signup').withBody({ email: dto.email }).expectStatus(400);
      });
      it('should throw if no body provided', ()=>{
        return pactum.spec().post('/auth/signup').expectStatus(400);
      });

      it('should signup',()=>{
        return pactum.spec().post('/auth/signup').withBody(dto).expectStatus(201);
      });
    });
    describe('Signin', ()=>{

      it('should throw if email is empty', ()=>{
        return pactum.spec().post('/auth/signin').withBody({ password: dto.password }).expectStatus(400);
      });
      it('should throw if password is empty', ()=>{
        return pactum.spec().post('/auth/signin').withBody({ email: dto.email }).expectStatus(400);
      });
      it('should throw if no body provided', ()=>{
        return pactum.spec().post('/auth/signin').expectStatus(400);
      });

      it('should signin', ()=>{
        return pactum.spec().post('/auth/signin').withBody(dto).expectStatus(200).stores('userToken', 'access_token');
      });
    });
  });
  describe('User', ()=>{
    describe('Get user', ()=>{
      it('Should get current user', ()=>{
        return pactum.spec().get('/users/me').withHeaders({ Authorization: 'Bearer $S{userToken}' }).expectStatus(200);
      });
    });

    describe('Edit user', ()=>{
      it('Should edit user', ()=>{
        const dto: EditUserDto = {
          firstName: 'John',
          lastName: 'Doe'
        }
        return pactum.spec().patch('/users')
          .withHeaders({ Authorization: 'Bearer $S{userToken}' })
          .withBody(dto)
          .expectStatus(200)
          //.expectBodyContains(dto.firstName);
      });
    });

  });
  describe('Bookmarks', ()=>{
    describe('Get empty bookmark', ()=>{
      it('Should get bookmarks', ()=>{
        return pactum.spec().get('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userToken}' })
          .expectStatus(200)
          .expectBody([]);
      });
    });
    describe('Create bookmark', ()=>{

      const dto:CreateBookmarkDto = {
        title: "First Bookmark",
        link: "http://example.com"
      }

      it('Should create bookmark', ()=>{
        return pactum.spec().post('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userToken}' })
          .withBody(dto)
          .expectStatus(201)
          .stores('bookmarkId', 'id');
      });
    });
    describe('Get bookmarks', ()=>{
      it('Should get bookmarks', ()=>{
        return pactum.spec().get('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userToken}' })
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });
    describe('Get bookmark by id', ()=>{
      it('Should get bookmark by id', ()=>{
        return pactum.spec().get('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{userToken}' })
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}');
      });
    });
    describe('Edit bookmark', ()=>{
      
      const dto: EditBookmarkDto = {
        description: "this is a test bookmark"
      }

      it('Should edit bookmark by id', ()=>{
        return pactum.spec().patch('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{userToken}' })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.description);
      });

    });
    describe('Delete bookmark', ()=>{

      it('Should delete bookmark by id', ()=>{
        return pactum.spec().delete('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({ Authorization: 'Bearer $S{userToken}' })
          .expectStatus(204);
      });

      it('Should get bookmarks', ()=>{
        return pactum.spec().get('/bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userToken}' })
          .expectStatus(200)
          .expectJsonLength(0);
      });

    });
  });

});