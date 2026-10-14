/**
 * IndexPage - 首页
 * 
 * 注意：此文件为 ArkTS 代码示例，需将其内容复制到 DevEco Studio 生成的 Stage 工程中使用
 * 
 * 功能：
 * 1. 轮播图展示
 * 2. 分类导航
 * 3. 商品推荐列表
 * 4. 响应式布局适配
 */

import { View, Text, Image, Swiper, SwiperItem, Grid, GridItem, NavRouter } from '@kit.ArkUI'
import { Resource, Color } from '@kit.CoreKit'
import { productService } from '../network/ProductService'
import { Product } from '../models/Product'
import { router } from '@kit.AbilityKit'

@Entry
@Component
struct IndexPage {
  @State banners: string[] = [
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20ecommerce%20banner%20with%20tech%20products&image_size=landscape_16_9',
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fashion%20sale%20promotional%20banner&image_size=landscape_16_9',
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=electronic%20devices%20showcase%20banner&image_size=landscape_16_9'
  ]
  
  @State categories: Array<{ icon: string; name: string; id: number }> = [
    { icon: 'shopping', name: '数码', id: 1 },
    { icon: 'clothes', name: '服饰', id: 2 },
    { icon: 'food', name: '食品', id: 3 },
    { icon: 'home', name: '家居', id: 4 },
    { icon: 'beauty', name: '美妆', id: 5 },
    { icon: 'sport', name: '运动', id: 6 },
    { icon: 'book', name: '图书', id: 7 },
    { icon: 'more', name: '更多', id: 8 }
  ]
  
  @State products: Product[] = []
  @State isLoading: boolean = true

  aboutToAppear() {
    this.loadProducts()
  }

  async loadProducts() {
    this.isLoading = true
    try {
      const data = await productService.getRecommendProducts()
      this.products = data
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      this.isLoading = false
    }
  }

  build() {
    Column() {
      this.buildHeader()
      Scroll() {
        Column({ space: 16 }) {
          this.buildBanner()
          this.buildCategories()
          this.buildProductSection()
        }
        .padding({ left: 16, right: 16 })
      }
    }
    .width('100%')
    .backgroundColor('#F5F7FA')
  }

  @Builder
  buildHeader() {
    Row() {
      Text('Gexm')
        .fontSize(28)
        .fontWeight(FontWeight.Bold)
        .fontColor('#2563EB')
        .margin({ left: 16 })
      
      Blank()
      
      Image($r('app.media.search'))
        .width(24)
        .height(24)
        .margin({ right: 16 })
    }
    .height(56)
    .width('100%')
    .backgroundColor(Color.White)
    .alignItems(VerticalAlign.Center)
  }

  @Builder
  buildBanner() {
    Swiper() {
      ForEach(this.banners, (url: string, index: number) => {
        SwiperItem() {
          Image(url)
            .width('100%')
            .height(160)
            .borderRadius(12)
            .objectFit(ImageFit.Cover)
        }
      }, (url: string) => url)
    }
    .width('100%')
    .height(160)
    .autoPlay(true)
    .interval(3000)
    .indicator(true)
    .indicatorStyle({
      size: 8,
      left: 10,
      bottom: 10,
      color: 'rgba(255,255,255,0.5)',
      selectedColor: '#FFFFFF'
    })
  }

  @Builder
  buildCategories() {
    Grid() {
      ForEach(this.categories, (item: { icon: string; name: string; id: number }) => {
        GridItem() {
          Column({ space: 8 }) {
            Image($r(`app.media.${item.icon}`))
              .width(48)
              .height(48)
            Text(item.name)
              .fontSize(12)
              .fontColor('#666666')
          }
          .width('100%')
          .height('100%')
          .alignItems(HorizontalAlign.Center)
          .justifyContent(FlexAlign.Center)
        }
        .onClick(() => {
          router.pushUrl({ url: `pages/category/category?id=${item.id}` })
        })
      })
    }
    .width('100%')
    .height(180)
    .gridTemplateColumns('repeat(4, 1fr)')
    .gridTemplateRows('repeat(2, 1fr)')
    .backgroundColor(Color.White)
    .borderRadius(12)
    .padding(16)
  }

  @Builder
  buildProductSection() {
    Column({ space: 12 }) {
      Row() {
        Text('为你推荐')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#1F2937')
        
        Text('更多')
          .fontSize(14)
          .fontColor('#2563EB')
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceBetween)

      if (this.isLoading) {
        this.buildLoading()
      } else {
        Grid() {
          ForEach(this.products, (product: Product) => {
            GridItem() {
              this.buildProductCard(product)
            }
          })
        }
        .width('100%')
        .gridTemplateColumns('repeat(2, 1fr)')
        .gridGap(12)
      }
    }
  }

  @Builder
  buildProductCard(product: Product) {
    Column({ space: 8 }) {
      Image(product.image)
        .width('100%')
        .height(180)
        .borderRadius(8)
        .objectFit(ImageFit.Cover)
      
      Text(product.name)
        .fontSize(14)
        .fontColor('#1F2937')
        .maxLines(2)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
      
      Row() {
        Text(`¥${product.price}`)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor('#EF4444')
        
        Blank()
        
        Text(`${product.sales}已售`)
          .fontSize(12)
          .fontColor('#9CA3AF')
      }
      .width('100%')
    }
    .width('100%')
    .backgroundColor(Color.White)
    .borderRadius(12)
    .padding(12)
    .onClick(() => {
      router.pushUrl({ url: `pages/product/detail?id=${product.id}` })
    })
  }

  @Builder
  buildLoading() {
    Row() {
      LoadingProgress()
        .width(24)
        .height(24)
        .color('#2563EB')
    }
    .width('100%')
    .height(200)
    .justifyContent(FlexAlign.Center)
  }
}